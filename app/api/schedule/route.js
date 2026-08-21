import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Kunci Supabase Environment Variables belum ditetapkan.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json({ error: 'Format data JSON tidak sah.' }, { status: 400 });
    }

    const { pageIds, message, imageUrl, videoUrl, firstComment, commentImageUrl, scheduledAt } = body;

    if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
      return NextResponse.json({ error: 'Sila pilih sekurang-kurangnya satu Facebook Page.' }, { status: 400 });
    }

    // A. Simpan ke database jika pos dijadualkan ATAU Auto-Queue
    if (scheduledAt) {
      let targetScheduledTime;

      if (scheduledAt === 'auto-queue') {
        // Logik Auto-Queue: Cari pos terakhir yang 'pending' untuk dijadikan rujukan
        const { data: lastPosts } = await supabase
          .from('scheduled_posts')
          .select('scheduled_at')
          .eq('status', 'pending')
          .order('scheduled_at', { ascending: false })
          .limit(1);

        let baseDate = new Date();
        if (lastPosts && lastPosts.length > 0 && lastPosts[0].scheduled_at) {
          const lastDate = new Date(lastPosts[0].scheduled_at);
          if (!isNaN(lastDate.getTime())) {
            baseDate = lastDate;
          }
        }

        // Tambah 30 minit sebagai anggaran auto-queue ringkas jika tiada pengiraan kompleks
        baseDate.setMinutes(baseDate.getMinutes() + 30);
        targetScheduledTime = baseDate.toISOString();
      } else {
        const formattedScheduledAt = scheduledAt.endsWith('Z') || scheduledAt.includes('+') ? scheduledAt : `${scheduledAt}:00+08:00`;
        const parsedDate = new Date(formattedScheduledAt);
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json({ error: 'Format masa jadual tidak sah (Invalid time value).' }, { status: 400 });
        }
        targetScheduledTime = parsedDate.toISOString();
      }

      const { error: insertError } = await supabase.from('scheduled_posts').insert({
        page_ids: pageIds,
        message: message || '',
        image_url: imageUrl || null,
        video_url: videoUrl || null,
        first_comment: firstComment || null,
        comment_image_url: commentImageUrl || null,
        scheduled_at: targetScheduledTime,
        status: 'pending',
      });

      if (insertError) {
        console.error('Supabase Insert Error:', insertError);
        return NextResponse.json({ error: `Gagal menjadualkan pos: ${insertError.message}` }, { status: 500 });
      }

      return NextResponse.json({ scheduled: true, message: 'Pos berjaya dimasukkan ke dalam senarai queue!' }, { status: 200 });
    }

    // B. Pos serta-merta
    const { data: pages, error: dbError } = await supabase
      .from('pages')
      .select('page_id, page_name, access_token')
      .in('page_id', pageIds);

    if (dbError || !pages || pages.length === 0) {
      console.error('Supabase DB Error / Pages not found:', dbError);
      return NextResponse.json({ error: 'Gagal mendapatkan data Page daripada database.' }, { status: 500 });
    }

    const results = [];

    for (const page of pages) {
      try {
        let postRes;

        if (videoUrl) {
          postRes = await fetch(`https://graph.facebook.com/v26.0/${page.page_id}/videos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_url: videoUrl,
              description: message,
              access_token: page.access_token,
            }),
          });
        } else if (imageUrl) {
          postRes = await fetch(`https://graph.facebook.com/v26.0/${page.page_id}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: imageUrl,
              caption: message,
              access_token: page.access_token,
            }),
          });
        } else {
          postRes = await fetch(`https://graph.facebook.com/v26.0/${page.page_id}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: message,
              access_token: page.access_token,
            }),
          });
        }

        const postData = await postRes.json();

        if (!postRes.ok || postData.error) {
          results.push({
            page: page.page_name,
            success: false,
            error: postData.error?.message || 'Gagal membuat pos',
          });
          continue;
        }

        let commentSuccess = false;
        let commentError = null;

        if ((firstComment && firstComment.trim() !== '') || commentImageUrl) {
          const delayTime = videoUrl ? 4000 : 2000;
          await new Promise((resolve) => setTimeout(resolve, delayTime));

          const targetCommentId = postData.post_id || postData.id;
          const commentPayload = { access_token: page.access_token };
          if (firstComment) commentPayload.message = firstComment;
          if (commentImageUrl) commentPayload.attachment_url = commentImageUrl;

          const commentRes = await fetch(`https://graph.facebook.com/v26.0/${targetCommentId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commentPayload),
          });

          const commentData = await commentRes.json();
          if (commentRes.ok && !commentData.error) {
            commentSuccess = true;
          } else {
            commentError = commentData.error?.message || 'Gagal menghantar komen';
          }
        }

        results.push({
          page: page.page_name,
          success: true,
          postId: postData.post_id || postData.id,
          commentSuccess: (firstComment || commentImageUrl) ? commentSuccess : null,
          commentError: commentError,
        });
      } catch (err) {
        results.push({
          page: page.page_name,
          success: false,
          error: err.message,
        });
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('CRITICAL API ERROR:', error);
    return NextResponse.json({ error: error.message || 'Ralat dalaman server.' }, { status: 500 });
  }
}
