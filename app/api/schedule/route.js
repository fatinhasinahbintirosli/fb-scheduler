import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { pages, message, mediaUrl, commentText, commentImageUrl } = await request.json();
    const results = [];

    for (const page of pages) {
      const pageId = page.page_id;
      const accessToken = page.access_token;

      // 1. Pos Kandungan Utama (Guna URLSearchParams untuk keserasian Meta Graph API)
      let postEndpoint = `https://graph.facebook.com/v26.0/${pageId}/feed`;
      const postParams = new URLSearchParams();
      postParams.append('access_token', accessToken);

      if (mediaUrl) {
        postEndpoint = `https://graph.facebook.com/v26.0/${pageId}/photos`;
        if (message) postParams.append('caption', message);
        postParams.append('url', mediaUrl);
      } else {
        if (message) postParams.append('message', message);
      }

      const postRes = await fetch(postEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postParams.toString()
      });
      const postData = await postRes.json();

      if (postData.error) {
        results.push({ page: page.page_name, success: false, error: postData.error.message });
        continue;
      }

      // 2. Pos Auto First Comment jika pos utama berjaya
      let commentResult = null;
      if (postData.id && (commentText || commentImageUrl)) {
        const commentEndpoint = `https://graph.facebook.com/v26.0/${postData.id}/comments`;
        const commentParams = new URLSearchParams();
        commentParams.append('access_token', accessToken);
        if (commentText) commentParams.append('message', commentText);
        if (commentImageUrl) commentParams.append('attachment_url', commentImageUrl);

        const commentRes = await fetch(commentEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: commentParams.toString()
        });
        const commentData = await commentRes.json();
        commentResult = commentData;
      }

      results.push({
        page: page.page_name,
        success: true,
        postId: postData.id,
        comment: commentResult
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
