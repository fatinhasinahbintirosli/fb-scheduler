'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export default function Home() {
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [commentImageUrl, setCommentImageUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [postMode, setPostMode] = useState('now'); // 'now', 'manual', 'auto'
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPages, setFetchingPages] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    async function initData() {
      try {
        const { data: pData } = await supabase.from('pages').select('page_id, page_name').order('page_name', { ascending: true });
        const { data: sData } = await supabase.from('scheduled_posts').select('*').order('created_at', { ascending: false });
        
        setPages(pData || []);
        setScheduledPosts(sData || []);
      } catch (err) {
        console.error('Ralat memuatkan data:', err);
      } finally {
        setFetchingPages(false);
      }
    }
    initData();
  }, []);

  const handleSelectAll = () => {
    if (selectedPages.length === pages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(pages.map((p) => p.page_id));
    }
  };

  const handlePageToggle = (pageId) => {
    if (selectedPages.includes(pageId)) {
      setSelectedPages(selectedPages.filter((id) => id !== pageId));
    } else {
      setSelectedPages([...selectedPages, pageId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedPages.length === 0) {
      alert('Sila pilih sekurang-kurangnya satu Facebook Page.');
      return;
    }

    setLoading(true);
    
    let finalScheduledAt = scheduledAt || null;

    // Jika pilih Auto-Queue Last, kita boleh tetapkan nilai atau endpoint khas jika perlu, 
    // atau biarkan backend uruskan berdasarkan logik queue anda.
    const payload = {
      pageIds: selectedPages,
      message: message,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      firstComment: firstComment || null,
      commentImageUrl: commentImageUrl || null,
      scheduledAt: postMode === 'auto' ? 'auto-queue' : finalScheduledAt,
    };

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error('Server membalas bukan dalam bentuk JSON yang sah.');
      }

      if (!res.ok) throw new Error(data.error || 'Gagal memproses permintaan.');

      alert(data.message || 'Berjaya!');
      setMessage('');
      setImageUrl('');
      setVideoUrl('');
      setFirstComment('');
      setCommentImageUrl('');
      setScheduledAt('');

      const { data: sData } = await supabase.from('scheduled_posts').select('*').order('created_at', { ascending: false });
      setScheduledPosts(sData || []);
    } catch (err) {
      alert(`Ralat: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: '900px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* Header & Link ke Tetapan Timeslot */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
        <div>
          <Link 
            href="/queue-settings" 
            style={{ 
              display: 'inline-block', 
              padding: '8px 14px', 
              backgroundColor: '#242526', 
              color: '#fff', 
              borderRadius: '8px', 
              textDecoration: 'none', 
              fontSize: '13px', 
              fontWeight: 'bold',
              border: '1px solid #3a3b3c',
              marginBottom: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            ⚙️ Update Time Slots
          </Link>
          <h1 style={{ color: '#1877f2', margin: '0 0 8px 0' }}>Facebook Scheduler</h1>
          <p style={{ color: '#65676b', fontSize: '14px', margin: 0 }}>Hantar atau uruskan jadual pos anda dengan mudah.</p>
        </div>
      </div>

      {/* Bahagian Borang Pos */}
      <section style={{ background: '#f4f4f4', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <form onSubmit={handleSubmit}>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '15px' }}>Pilih Facebook Pages ({selectedPages.length}/{pages.length}):</label>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{ fontSize: '13px', background: 'none', border: 'none', color: '#1877f2', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {selectedPages.length === pages.length ? 'Nyahpilih Semua' : 'Pilih Semua'}
              </button>
            </div>

            {fetchingPages ? (
              <p style={{ fontSize: '13px', color: '#888' }}>Sedang memuatkan senarai Page...</p>
            ) : (
              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#fff' }}>
                {pages.map((page) => (
                  <label key={page.page_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedPages.includes(page.page_id)}
                      onChange={() => handlePageToggle(page.page_id)}
                    />
                    <span>{page.page_name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Kapsyen Pos:</label>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Tulis kapsyen anda di sini..." 
              style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Image URL (Pilihan):</label>
            <input 
              type="text" 
              value={imageUrl} 
              onChange={(e) => setImageUrl(e.target.value)} 
              placeholder="https://example.com/image.jpg" 
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Video URL (Pilihan):</label>
            <input 
              type="text" 
              value={videoUrl} 
              onChange={(e) => setVideoUrl(e.target.value)} 
              placeholder="https://example.com/video.mp4" 
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
            />
          </div>

          <div style={{ marginBottom: '15px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>First Comment (Pilihan):</label>
            <input 
              type="text" 
              value={firstComment} 
              onChange={(e) => setFirstComment(e.target.value)} 
              placeholder="Tulis komen pertama..." 
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', marginBottom: '10px' }} 
            />
            
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', color: '#555' }}>Comment Image URL (Pilihan):</label>
            <input 
              type="text" 
              value={commentImageUrl} 
              onChange={(e) => setCommentImageUrl(e.target.value)} 
              placeholder="https://example.com/comment-image.jpg" 
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
            />
          </div>

          {/* Pilihan Mod Pos (Pos Sekarang / Jadual Manual / Auto-Queue Last) */}
          <div style={{ marginBottom: '15px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              <input 
                type="radio" 
                name="postMode" 
                checked={postMode === 'now'} 
                onChange={() => { setPostMode('now'); setScheduledAt(''); }} 
              />
              Pos Sekarang
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              <input 
                type="radio" 
                name="postMode" 
                checked={postMode === 'manual'} 
                onChange={() => setPostMode('manual')} 
              />
              Jadual Manual
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              <input 
                type="radio" 
                name="postMode" 
                checked={postMode === 'auto'} 
                onChange={() => { setPostMode('auto'); setScheduledAt(''); }} 
              />
              Auto-Queue Last
            </label>
          </div>

          {/* Papar input masa hanya jika pilih Jadual Manual */}
          {postMode === 'manual' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Pilih Masa Jadual:</label>
              <input 
                type="datetime-local" 
                value={scheduledAt} 
                onChange={(e) => setScheduledAt(e.target.value)} 
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} 
              />
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading} 
            style={{ width: '100%', padding: '12px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'Memproses...' : (postMode === 'now' ? 'Hantar Sekarang' : (postMode === 'auto' ? 'Masukkan ke Auto-Queue' : 'Jadualkan Pos'))}
          </button>
        </form>
      </section>

      {/* Jadual Pos */}
      <section>
        <h2>Senarai Pos Dijadualkan / Lepas</h2>
        <div style={{ overflowX: 'auto', marginTop: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <thead>
              <tr style={{ background: '#eee', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Mesej</th>
                <th style={{ padding: '10px' }}>Masa</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {scheduledPosts.length === 0 ? (
                <tr><td colSpan="3" style={{ padding: '15px', textAlign: 'center', color: '#777' }}>Tiada rekod pos.</td></tr>
              ) : (
                scheduledPosts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.message || '(Tiada teks)'}</td>
                    <td style={{ padding: '10px' }}>{p.scheduled_at ? new Date(p.scheduled_at).toLocaleString() : '-'}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                        backgroundColor: p.status === 'published' ? '#d4edda' : '#fff3cd',
                        color: p.status === 'published' ? '#155724' : '#856404'
                      }}>
                        {p.status ? p.status.toUpperCase() : 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
