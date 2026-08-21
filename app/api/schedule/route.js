import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Pastikan pembolehubah persekitaran (environment variables) anda ditetapkan di Vercel/Local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req) {
  try {
    const contentType = req.headers.get('content-type') || '';
    
    let pageIds, message, firstComment, postMode, scheduledAt;

    // Menangani data sama ada melalui FormData atau JSON biasa
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const pageIdsRaw = formData.get('pageIds');
      
      // Jika pageIds dihantar sebagai string JSON, parse ia. 
      // Jika sudah array, terus guna.
      try {
        pageIds = typeof pageIdsRaw === 'string' ? JSON.parse(pageIdsRaw) : pageIdsRaw;
      } catch (e) {
        pageIds = [];
      }
      
      message = formData.get('message') || '';
      firstComment = formData.get('firstComment') || '';
      postMode = formData.get('postMode') || 'now';
      scheduledAt = formData.get('scheduledAt') || null;
      
    } else {
      const body = await req.json();
      pageIds = body.pageIds || [];
      message = body.message || '';
      firstComment = body.firstComment || '';
      postMode = body.postMode || 'now';
      scheduledAt = body.scheduledAt || null;
    }

    // Validasi asas
    if (!pageIds || (Array.isArray(pageIds) && pageIds.length === 0)) {
      return NextResponse.json({ error: 'Sila pilih sekurang-kurangnya satu Page.' }, { status: 400 });
    }

    // Tentukan masa pos
    let finalScheduledTime = new Date();
    if (postMode === 'schedule' && scheduledAt) {
      finalScheduledTime = new Date(scheduledAt);
    } else if (postMode === 'queue') {
      // Contoh logik: Tambah 1 jam dari sekarang
      finalScheduledTime = new Date(Date.now() + 60 * 60 * 1000);
    }

    // Persediaan data untuk dimasukkan ke Supabase
    // Menggunakan kolum 'page_ids' (jsonb) seperti dalam skema anda
    const insertData = {
      page_ids: pageIds, 
      message: message,
      first_comment: firstComment,
      post_mode: postMode,
      scheduled_at: finalScheduledTime.toISOString(),
      status: 'pending'
    };

    // Masukkan ke dalam jadual 'scheduled_posts'
    const { error } = await supabase
      .from('scheduled_posts')
      .insert([insertData]);

    if (error) {
      console.error('Supabase Insert Error:', error);
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Pos berjaya dijadualkan!' });

  } catch (err) {
    console.error('Ralat API Schedule:', err);
    return NextResponse.json({ error: err.message || 'Ralat tidak diketahui' }, { status: 500 });
  }
}
