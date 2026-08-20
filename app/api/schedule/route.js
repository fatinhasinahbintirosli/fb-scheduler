import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req) {
  try {
    // Semak sama ada request dihantar sebagai FormData atau JSON
    const contentType = req.headers.get('content-type') || '';
    
    let pageIds, message, firstComment, postMode, scheduledAt;
    let mediaFile = null;
    let firstCommentImage = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const pageIdsRaw = formData.get('pageIds');
      pageIds = pageIdsRaw ? JSON.parse(pageIdsRaw) : [];
      message = formData.get('message') || '';
      firstComment = formData.get('firstComment') || '';
      postMode = formData.get('postMode') || 'now';
      scheduledAt = formData.get('scheduledAt') || null;
      
      mediaFile = formData.get('mediaFile');
      firstCommentImage = formData.get('firstCommentImage');
    } else {
      const body = await req.json();
      pageIds = body.pageIds || [];
      message = body.message || '';
      firstComment = body.firstComment || '';
      postMode = body.postMode || 'now';
      scheduledAt = body.scheduledAt || null;
    }

    if (!pageIds || pageIds.length === 0) {
      return NextResponse.json({ error: 'Sila pilih sekurang-kurangnya satu Page.' }, { status: 400 });
    }

    // Tentukan masa pos berdasarkan mod
    let finalScheduledTime = new Date();
    if (postMode === 'schedule' && scheduledAt) {
      finalScheduledTime = new Date(scheduledAt);
    } else if (postMode === 'queue') {
      // Logik auto-queue ringkas (contoh: tambah 1 jam dari sekarang jika tiada queue lain)
      finalScheduledTime = new Date(Date.now() + 60 * 60 * 1000);
    }

    // Simpan ke dalam database Supabase (Jadual: scheduled_posts)
    const inserts = pageIds.map(pageId => ({
      page_id: pageId,
      message: message,
      first_comment: firstComment,
      post_mode: postMode,
      scheduled_at: finalScheduledTime.toISOString(),
      status: 'pending'
    }));

    const { error } = await supabase.from('scheduled_posts').insert(inserts);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Pos berjaya dijadualkan/disimpan!' });
  } catch (err) {
    console.error('Ralat API Schedule:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
