import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request) {
  try {
    const body = await request.json();
    const { pageIds, message, imageUrl, firstComment } = body;

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

    // 2. Loop setiap page untuk hantar pos & komen
    for (const page of pages) {
      try {
        let postData;

        if (imageUrl) {
          // Guna endpoint /photos
          const photoRes = await fetch(
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
          postData = await photoRes.json();
        } else {
          // Guna endpoint /feed
          const feedRes = await fetch(
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
          postData = await feedRes.json();
        }

        if (postData.error) {
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
          // Beri jeda 3 saat supaya Meta siap proses ID pos di server mereka
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Pastikan sasaran ID adalah Page Post ID komposit atau Photo ID
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
            console.error(`Ralat Komen (${page.page_name}):`, commentData.error);
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
