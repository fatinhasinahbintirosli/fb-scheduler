import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { pages, message, mediaUrl, commentText, commentImageUrl } = await request.json();
    const results = [];

    for (const page of pages) {
      const pageId = page.page_id;
      const accessToken = page.access_token;

      // 1. Pos Kandungan Utama (Gambar atau Teks)
      let postEndpoint = `https://graph.facebook.com/v26.0/${pageId}/feed`;
      let postPayload = { message: message, access_token: accessToken };

      if (mediaUrl) {
        postEndpoint = `https://graph.facebook.com/v26.0/${pageId}/photos`;
        postPayload = { caption: message, url: mediaUrl, access_token: accessToken };
      }

      const postRes = await fetch(postEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postPayload)
      });
      const postData = await postRes.json();

      // 2. Pos Auto-First Comment jika ada
      let commentData = null;
      if (postData.id && (commentText || commentImageUrl)) {
        const commentEndpoint = `https://graph.facebook.com/v26.0/${postData.id}/comments`;
        const commentPayload = {
          message: commentText || '',
          access_token: accessToken
        };
        if (commentImageUrl) {
          commentPayload.attachment_url = commentImageUrl;
        }

        const commentRes = await fetch(commentEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commentPayload)
        });
        commentData = await commentRes.json();
      }

      results.push({ page: page.page_name, postId: postData.id, commentId: commentData?.id, error: postData.error });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
