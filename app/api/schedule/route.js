import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

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
        // 1. Dapatkan pos 'pending' yang terakhir
        const { data: lastPosts } = await supabase
          .from('scheduled_posts')
          .select('scheduled_at')
          .eq('status', 'pending')
          .order('scheduled_at', { ascending: false })
          .limit(1);

        // 2. Dapatkan senarai timeslot aktif dari queue_settings
        const { data: queueSettings } = await supabase
          .from('queue_settings')
          .select('*')
          .eq('is_active', true);

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
          
          // Tukar semua slot kepada minit dari tengah malam untuk perbandingan tepat (elak masalah 2:30 PM vs 03:00 PM)
          const parseTimeToMinutes = (timeStr) => {
            if (!timeStr) return 0;
            // Jika format ada AM/PM (contoh: "02:30 PM")
            if (timeStr.includes('M')) {
              const [timePart, modifier] = timeStr.split(' ');
              let [hours, minutes] = timePart.split(':').map(Number);
              if (modifier === 'PM' && hours < 12) hours += 12;
              if (modifier === 'AM' && hours === 12) hours = 0;
              return hours * 60 + minutes;
            }
            // Format 24 jam ("14:30:00")
            const parts = timeStr.split(':').map(Number);
            return parts[0] * 60 + (parts[1] || 0);
          };

          const baseMinutes = baseDate.getHours() * 60 + baseDate.getMinutes();

          // Tapis slot untuk hari yang sama yang masanya LEBIH LEWAT daripada pos terakhir
          const todaySlots = queueSettings
            .filter((q) => q.day_of_week === currentDayOfWeek)
            .map((q) => ({ ...q, totalMinutes: parseTimeToMinutes(q.time_slot) }))
            .sort((a, b) => a.totalMinutes - b.totalMinutes);

          let candidate = todaySlots.find((q) => q.totalMinutes > baseMinutes);

          // Jika tiada slot lewat hari ini, ambil slot pertama hari esok
          if (!candidate) {
            baseDate.setDate(baseDate.getDate() + 1);
            baseDate.setHours(0, 0, 0, 0);
            const nextDayOfWeek = baseDate.getDay();
            
            const tomorrowSlots = queueSettings
              .filter((q) => q.day_of_week === nextDayOfWeek)
              .map((q) => ({ ...q, totalMinutes: parseTimeToMinutes(q.time_slot) }))
              .sort((a, b) => a.totalMinutes - b.totalMinutes);

            candidate = tomorrowSlots[0] || queueSettings[0];
          }

          if (candidate && candidate.time_slot) {
            nextSlotTimeStr = candidate.time_slot;
          }
        }

        if (nextSlotTimeStr) {
          // Masukkan masa ke baseDate
          if (nextSlotTimeStr.includes('M')) {
            const [timePart, modifier] = nextSlotTimeStr.split(' ');
            let [hours, minutes] = timePart.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            baseDate.setHours(hours, minutes, 0, 0);
          } else {
            const [hours, minutes, seconds] = nextSlotTimeStr.split(':');
            baseDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), parseInt(seconds || 0, 10), 0);
          }
        } else {
          baseDate.setMinutes(baseDate.getMinutes() + 30);
        }

        targetScheduledTime = baseDate.toISOString();
      } else {
        const formattedScheduledAt = scheduledAt.endsWith('Z') || scheduledAt.includes('+') ? scheduledAt : `${scheduledAt}:00+08:00`;
        const parsedDate = new Date(formattedScheduledAt);
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json({ error: 'Format masa jadual tidak sah.' }, { status: 400 });
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
        return NextResponse.json({ error: `Gagal menjadualkan pos: ${insertError.message}` }, { status: 500 });
      }

      return NextResponse.json({ scheduled: true, message: 'Pos berjaya dimasukkan mengikut Auto-Queue timeslot!' }, { status: 200 });
    }

    // Pos serta-merta
    const { data: pages, error: dbError } = await supabase
      .from('pages')
      .select('page_id, page_name, access_token')
      .in('page_id', pageIds);

    if (dbError || !pages || pages.length === 0) {
      return NextResponse.json({ error: 'Gagal mendapatkan data Page.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Ralat dalaman server.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

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
