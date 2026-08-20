import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {import { createClient } from '@supabase/supabase-js';
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
    const body = await request.json();
    const { pageIds, message, imageUrl, videoUrl, firstComment, commentImageUrl, scheduledAt } = body;

    if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
      return NextResponse.json({ error: 'Sila pilih sekurang-kurangnya satu Facebook Page.' }, { status: 400 });
    }

    // A. Jika ada masa dijadualkan -> Simpan ke Database
    if (scheduledAt) {
      const { error: insertError } = await supabase.from('scheduled_posts').insert({
        page_ids: pageIds,
        message: message || '',
        image_url: imageUrl || null,
        video_url: videoUrl || null,
        first_comment: firstComment || null,
        comment_image_url: commentImageUrl || null,
        scheduled_at: new Date(scheduledAt).toISOString(),
        status: 'pending',
      });

      if (insertError) {
        return NextResponse.json({ error: `Gagal menjadualkan pos: ${insertError.message}` }, { status: 500 });
      }

      return NextResponse.json({ scheduled: true, message: 'Pos berjaya dijadualkan!' }, { status: 200 });
    }

    // B. Jika pos serta-merta -> Hantar terus ke Facebook
    const { data: pages, error: dbError } = await supabase
      .from('pages')
      .select('page_id, page_name, access_token')
      .in('page_id', pageIds);

    if (dbError || !pages || pages.length === 0) {
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
    return NextResponse.json({ error: error.message || 'Ralat dalaman server.' }, { status: 500 });
  }
}
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

    const body = await request.json();
    const { pageIds, message, imageUrl, videoUrl, firstComment, commentImageUrl } = body;

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

    // 2. Loop setiap page untuk pos
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

        // 3. Hantar First Comment (Teks / Gambar)
        let commentSuccess = false;
        let commentError = null;

        if ((firstComment && firstComment.trim() !== '') || commentImageUrl) {
          const delayTime = videoUrl ? 4000 : 2000;
          await new Promise((resolve) => setTimeout(resolve, delayTime));

          const targetCommentId = postData.post_id || postData.id;

          const commentPayload = {
            access_token: page.access_token,
          };

          if (firstComment) commentPayload.message = firstComment;
          if (commentImageUrl) commentPayload.attachment_url = commentImageUrl;

          const commentRes = await fetch(
            `https://graph.facebook.com/v26.0/${targetCommentId}/comments`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(commentPayload),
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
    return NextResponse.json(
      { error: error.message || 'Ralat dalaman server.' },
      { status: 500 }
    );
  }
}
