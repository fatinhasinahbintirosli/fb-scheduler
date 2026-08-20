import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { pages, message, mediaUrl, commentText, commentImageUrl } = await request.json();
    const results = [];

    for (const page of pages) {
      const pageId = page.page_id;
      const accessToken = page.access_token;

      let targetCommentId = null;

      // 1. Pos Utama (Gambar atau Teks)
      if (mediaUrl) {
        const photoParams = new URLSearchParams();
        photoParams.append('access_token', accessToken);
        photoParams.append('url', mediaUrl);
        if (message) photoParams.append('caption', message);

        const photoRes = await fetch(`https://graph.facebook.com/v26.0/${pageId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: photoParams.toString()
        });
        const photoData = await photoRes.json();

        if (photoData.error) {
          results.push({ page: page.page_name, success: false, error: photoData.error.message });
          continue;
        }

        // Untuk gambar, komen dihantar terus ke ID foto
        targetCommentId = photoData.id;
      } else {
        const feedParams = new URLSearchParams();
        feedParams.append('access_token', accessToken);
        if (message) feedParams.append('message', message);

        const feedRes = await fetch(`https://graph.facebook.com/v26.0/${pageId}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: feedParams.toString()
        });
        const feedData = await feedRes.json();

        if (feedData.error) {
          results.push({ page: page.page_name, success: false, error: feedData.error.message });
          continue;
        }

        targetCommentId = feedData.id;
      }

      // 2. Pos Auto First Comment
      let commentSuccess = true;
      let commentErrorMsg = null;

      if (targetCommentId && (commentText || commentImageUrl)) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const commentParams = new URLSearchParams();
        commentParams.append('access_token', accessToken);
        if (commentText) commentParams.append('message', commentText);
        if (commentImageUrl) commentParams.append('attachment_url', commentImageUrl);

        const commentRes = await fetch(`https://graph.facebook.com/v26.0/${targetCommentId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: commentParams.toString()
        });
        const commentData = await commentRes.json();

        if (commentData.error) {
          commentSuccess = false;
          commentErrorMsg = commentData.error.message;
        }
      }

      results.push({
        page: page.page_name,
        success: true,
        commentSuccess: commentSuccess,
        commentError: commentErrorMsg
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
