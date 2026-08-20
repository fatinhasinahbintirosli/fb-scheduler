import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Kunci Supabase Environment Variables belum ditetapkan di Vercel.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    const { pageIds, message, imageUrl, videoUrl, firstComment } = body;

    if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
      return NextResponse.json(
        { error: 'Sila pilih sekurang-kurangnya satu Facebook Page.' },
        { status: 400 }
      );
    }

    // 1. Ambil token dari Supabase
    const { data: pages, error: dbError } = await supabase
      .from('pages')
      .select('page_id, page_name, access_token')
      .in('page_id', pageIds);

    if (dbError || !pages || pages.length === 0) {
      return NextResponse.json(
        { error: 'Gagal mendapatkan data Page daripada database.' },
        { status: 500 }
      );
    }

    const results = [];

    // 2. Loop setiap page untuk hantar pos mengikut jenis media
    for (const page of pages) {
      try {
        let postRes;

        if (videoUrl) {
          postRes = await fetch(
            `https://graph.facebook.com/v26.0/${page.page_id}/videos`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file_url: videoUrl,
                description: message,
                access_token: page.access_token,
              }),
            }
          );
        } else if (imageUrl) {
          postRes = await fetch(
            `https://graph.facebook.com/v26.0/${page.page_id}/photos`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: imageUrl,
                caption: message,
                access_token: page.access_token,
              }),
            }
          );
        } else {
          postRes = await fetch(
            `https://graph.facebook.com/v26.0/${page.page_id}/feed`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: message,
                access_token: page.access_token,
              }),
            }
          );
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

        // 3. Hantar First Comment
        let commentSuccess = false;
        let commentError = null;

        if (firstComment && firstComment.trim() !== '') {
          const delayTime = videoUrl ? 4000 : 2000;
          await new Promise((resolve) => setTimeout(resolve, delayTime));

          const targetCommentId = postData.post_id || postData.id;

          const commentRes = await fetch(
            `https://graph.facebook.com/v26.0/${targetCommentId}/comments`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: firstComment,
                access_token: page.access_token,
              }),
            }
          );

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
          commentSuccess: firstComment ? commentSuccess : null,
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
    return NextResponse.json(
      { error: error.message || 'Ralat dalaman server.' },
      { status: 500 }
    );
  }
}
