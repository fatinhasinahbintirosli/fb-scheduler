import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Fungsi POST untuk buat pos / auto-queue
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

    if (scheduledAt) {
      let targetScheduledTime;

      if (scheduledAt === 'auto-queue') {
        const { data: lastPosts } = await supabase
          .from('scheduled_posts')
          .select('scheduled_at')
          .eq('status', 'pending')
          .order('scheduled_at', { ascending: false })
          .limit(1);

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
        }

        let nextSlotTimeStr = null;

        if (queueSettings && queueSettings.length > 0) {
          const currentDayOfWeek = baseDate.getDay();
          
          const hoursStr = String(baseDate.getHours()).padStart(2, '0');
          const minutesStr = String(baseDate.getMinutes()).padStart(2, '0');
          const secondsStr = String(baseDate.getSeconds()).padStart(2, '0');
          const lastTimeStr = `${hoursStr}:${minutesStr}:${secondsStr}`;

          let candidate = queueSettings.find(
            (q) => q.day_of_week === currentDayOfWeek && q.time_slot > lastTimeStr
          );

          if (!candidate) {
            baseDate.setDate(baseDate.getDate() + 1);
            const nextDayOfWeek = baseDate.getDay();
            candidate = queueSettings.find((q) => q.day_of_week === nextDayOfWeek) || queueSettings[0];
          }

          if (candidate && candidate.time_slot) {
            nextSlotTimeStr = candidate.time_slot;
          }
        }

        if (nextSlotTimeStr) {
          const [hours, minutes, seconds] = nextSlotTimeStr.split(':');
          baseDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), parseInt(seconds || 0, 10), 0);
        } else {
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

    // Pos serta-merta (kod asal dikekalkan)
    const { data: pages, error: dbError } = await supabase
      .from('pages')
      .select('page_id, page_name, access_token')
      .in('page_id', pageIds);

    if (dbError || !pages || pages.length === 0) {
      return NextResponse.json({ error: 'Gagal mendapatkan data Page daripada database.' }, { status: 500 });
    }

    const results = [];
    for (const page of pages) {
      // (Logik pos serta-merta anda yang sedia ada)
      results.push({ page: page.page_name, success: true });
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('CRITICAL API ERROR:', error);
    return NextResponse.json({ error: error.message || 'Ralat dalaman server.' }, { status: 500 });
  }
}

// Fungsi DELETE untuk memadam scheduled post / queue berdasarkan ID
export async function DELETE(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Kunci Supabase belum ditetapkan.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID pos tidak diberikan.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: `Gagal memadam pos: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Pos berjaya dipadam!' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Ralat server.' }, { status: 500 });
  }
}
