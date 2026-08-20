import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    // 1. Ambil pos pending yang masa <= waktu sekarang
    const { data: postsToPublish, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .limit(5);

    if (fetchError || !postsToPublish || postsToPublish.length === 0) {
      return NextResponse.json({ message: 'Tiada pos berjadual untuk diterbitkan.' });
    }

    for (const item of postsToPublish) {
      const { data: pages } = await supabase
        .from('pages')
        .select('page_id, page_name, access_token')
        .in('page_id', item.page_ids);

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

          // First Comment jika ada
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

      await supabase
        .from('scheduled_posts')
        .update({
          status: hasError ? 'failed' : 'published',
          error_log: errorLogs.length > 0 ? errorLogs.join(', ') : null,
        })
        .eq('id', item.id);
    }

    return NextResponse.json({ message: 'Cron job selesai diproses.' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
