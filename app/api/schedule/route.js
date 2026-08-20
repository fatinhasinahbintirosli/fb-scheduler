import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { pageIds, message, imageUrl, firstComment } = req.body;

  if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
    return res.status(400).json({ error: 'Sila pilih sekurang-kurangnya satu Facebook Page.' });
  }

  try {
    // 1. Dapatkan senarai token daripada Supabase
    const { data: pages, error: dbError } = await supabase
      .from('pages')
      .select('page_id, page_name, access_token')
      .in('page_id', pageIds);

    if (dbError || !pages || pages.length === 0) {
      return res.status(500).json({ error: 'Gagal mendapatkan data Page daripada database.' });
    }

    const results = [];

    // 2. Loop dan hantar posting ke setiap Page
    for (const page of pages) {
      try {
        let postEndpoint = `https://graph.facebook.com/v26.0/${page.page_id}/feed`;
        let postPayload = {
          message: message,
          access_token: page.access_token
        };

        // Jika terdapat URL Gambar, tukar ke endpoint photos
        if (imageUrl) {
          postEndpoint = `https://graph.facebook.com/v26.0/${page.page_id}/photos`;
          postPayload = {
            url: imageUrl,
            caption: message,
            access_token: page.access_token
          };
        }

        // Hantar Post Utama
        const postRes = await fetch(postEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postPayload)
        });

        const postData = await postRes.json();

        if (!postRes.ok || postData.error) {
          console.error(`Ralat pos ke ${page.page_name}:`, postData.error);
          results.push({
            page: page.page_name,
            success: false,
            error: postData.error?.message || 'Gagal pos'
          });
          continue;
        }

        // 3. Logik Menghantar First Comment
        let commentSuccess = false;
        let commentError = null;

        if (firstComment && firstComment.trim() !== '') {
          // Beri jeda 2 saat supaya Facebook selesai indeks pos/gambar
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // UTAMAKAN post_id jika pos bergambar, fallback kepada id biasa
          const targetCommentId = postData.post_id || postData.id;

          const commentRes = await fetch(
            `https://graph.facebook.com/v26.0/${targetCommentId}/comments`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: firstComment,
                access_token: page.access_token
              })
            }
          );

          const commentData = await commentRes.json();

          if (commentRes.ok && !commentData.error) {
            commentSuccess = true;
          } else {
            console.error(`Ralat komen di ${page.page_name}:`, commentData.error);
            commentError = commentData.error?.message || 'Gagal komen';
          }
        }

        results.push({
          page: page.page_name,
          success: true,
          postId: postData.post_id || postData.id,
          commentSuccess: firstComment ? commentSuccess : null,
          commentError: commentError
        });

      } catch (err) {
        console.error(`Exception pada ${page.page_name}:`, err);
        results.push({
          page: page.page_name,
          success: false,
          error: err.message
        });
      }
    }

    return res.status(200).json({ results });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message || 'Ralat dalaman server.' });
  }
}
