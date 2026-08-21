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
        // 1. Dapatkan pos 'pending' yang terakhir untuk tahu rujukan masa terakhir
        const { data: lastPosts } = await supabase
          .from('scheduled_posts')
          .select('scheduled_at')
          .eq('status', 'pending')
          .order('scheduled_at', { ascending: false })
          .limit(1);

        // 2. Dapatkan senarai timeslot aktif daripada table queue_settings
        const { data: queueSettings } = await supabase
          .from('queue_settings')
          .select('*')
          .eq('is_active', true)
          .order('time_slot', { ascending: true });

        let baseDate = new Date();
        if (lastPosts && lastPosts.length > 0 && lastPosts[0].scheduled_at) {
          const lastDate = new Date(lastPosts[0].scheduled_at);
          if (!isNaN(lastDate.getTime())) {
            baseDate = lastDate;
          }
        } else {
          // Jika tiada pos dalam queue, mula dari masa sekarang
          baseDate = new Date();
        }

        let nextSlotTimeStr = null;

        if (queueSettings && queueSettings.length > 0) {
          const currentDayOfWeek = baseDate.getDay(); // 0 = Ahad, 1 = Isnin, dst.
          const currentTimeStr = baseDate.toTimeString().split(' ')[0]; // Format "HH:MM:SS"

          // Cari slot pada hari yang sama yang masanya lebih lewat daripada masa rujukan
          let candidate = queueSettings.find(
            (q) => q.day_of_week === currentDayOfWeek && q.time_slot > currentTimeStr
          );

          // Jika tiada, cari slot seterusnya pada hari-hari berikutnya
          if (!candidate) {
            candidate = queueSettings[0]; // Ambil slot pertama sebagai fallback
          }

          if (candidate && candidate.time_slot) {
            nextSlotTimeStr = candidate.time_slot;
          }
        }

        if (nextSlotTimeStr) {
          // Gabungkan tarikh rujukan dengan time_slot dari database (HH:MM:SS)
          const [hours, minutes, seconds] = nextSlotTimeStr.split(':');
          baseDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), parseInt(seconds || 0, 10), 0);
          
          // Jika masa yang dikira sudah lepas, anjakkan ke hari esok pada slot tersebut
          if (baseDate <= new Date() && (!lastPosts || lastPosts.length === 0)) {
            baseDate.setDate(baseDate.getDate() + 1);
          }
        } else {
          // Fallback jika tiada timeslot dijumpai
          baseDate.setMinutes(baseDate.getMinutes() + 30);
        }

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

      return NextResponse.json({ scheduled: true, message: 'Pos berjaya dimasukkan mengikut Auto-Queue timeslot!' }, { status: 200 });
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
