import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase environment variables are missing.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const nowISO = new Date().toISOString();

    // 1. Ambil pos pending yang masanya sudah tiba
    const { data: postsToPublish, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', nowISO)
      .limit(5);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!postsToPublish || postsToPublish.length === 0) {
      return NextResponse.json({ message: 'Tiada pos berjadual untuk diterbitkan.' });
    }

    for (const item of postsToPublish) {
      // PENTING: Tukar status serta-merta kepada 'processing' agar cron lain tidak ambil pos yang sama (elak duplicate 3x)
      const { error: lockError } = await supabase
        .from('scheduled_posts')
        .update({ status: 'processing' })
        .eq('id', item.id)
        .eq('status', 'pending'); // Pastikan ia masih pending

      if (lockError) {
        continue; // Jika pos sudah diambil oleh proses lain, langkau ke pos seterusnya
      }

      const { data: pages, error: pageError } = await supabase
        .from('pages')
        .select('page_id, page_name, access_token')
        .in('page_id', item.page_ids);

      if (pageError || !pages || pages.length === 0) {
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'failed',
            error_log: 'Page tidak dijumpai atau sudah dipadam daripada database.',
          })
          .eq('id', item.id);
        continue;
      }

      let hasError = false;
      let errorLogs = [];

      for (const page of pages) {
        try {
          let postRes;

          if (item.video_url) {
            postRes = await fetch(`https://graph.facebook.com/v26.0/${page.page_id}/videos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file_url: item.video_url,
                description: item.message,
                access_token: page.access_token,
              }),
            });
          } else if (item.image_url) {
            postRes = await fetch(`https://graph.facebook.com/v26.0/${page.page_id}/photos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: item.image_url,
                caption: item.message,
                access_token: page.access_token,
              }),
            });
          } else {
            postRes = await fetch(`https://graph.facebook.com/v26.0/${page.page_id}/feed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: item.message,
                access_token: page.access_token,
              }),
            });
          }

          const postData = await postRes.json();

          if (!postRes.ok || postData.error) {
            hasError = true;
            errorLogs.push(`${page.page_name}: ${postData.error?.message || 'Gagal pos'}`);
            continue;
          }

          // Proses First Comment jika ada
          if (item.first_comment || item.comment_image_url) {
            await new Promise((resolve) => setTimeout(resolve, item.video_url ? 4000 : 2000));
            const targetCommentId = postData.post_id || postData.id;

            const commentPayload = { access_token: page.access_token };
            if (item.first_comment) commentPayload.message = item.first_comment;
            if (item.comment_image_url) commentPayload.attachment_url = item.comment_image_url;

            await fetch(`https://graph.facebook.com/v26.0/${targetCommentId}/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(commentPayload),
            });
          }
        } catch (err) {
          hasError = true;
          errorLogs.push(`${page.page_name}: ${err.message}`);
        }
      }

      const finalStatus = hasError ? 'failed' : 'published';

      // Kemaskini status akhir pos di database
      await supabase
        .from('scheduled_posts')
        .update({
          status: finalStatus,
          error_log: errorLogs.length > 0 ? errorLogs.join(', ') : null,
        })
        .eq('id', item.id);

      // ==========================================
      // AUTO-DELETE FAIL DARI SUPABASE STORAGE 
      // ==========================================
      if (finalStatus === 'published') {
        const mediaToCheck = [item.image_url, item.video_url, item.comment_image_url];
        
        for (const mediaUrl of mediaToCheck) {
          if (mediaUrl && mediaUrl.includes('supabase.co')) {
            try {
              const marker = '/post-media/';
              const markerIndex = mediaUrl.indexOf(marker);
              
              if (markerIndex !== -1) {
                const filePath = mediaUrl.substring(markerIndex + marker.length);
                const decodedFilePath = decodeURIComponent(filePath);

                console.log(`Cuba memadam fail dari storage: ${decodedFilePath}`);

                const { data, error: delError } = await supabase.storage
                  .from('post-media')
                  .remove([decodedFilePath]);

                if (delError) {
                  console.error('Ralat Supabase Storage remove:', delError.message);
                } else {
                  console.log('Berjaya padam fail:', data);
                }
              }
            } catch (delErr) {
              console.error('Gagal memproses pemadaman fail:', delErr.message);
            }
          }
        }
      }
    }

    return NextResponse.json({ message: 'Cron job selesai diproses.' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
