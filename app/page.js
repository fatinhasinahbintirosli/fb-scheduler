'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export default function Home() {
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [commentImageUrl, setCommentImageUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [postMode, setPostMode] = useState('now'); // 'now', 'manual', 'auto'
  const [message, setMessage] = useState('');
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
        setPages(pData || []);
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
    } catch (err) {
      alert(`Ralat: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: '900px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* Header & Butang Navigasi (Update Time Slots & Lihat Queue) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
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
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              ⚙️ Update Time Slots
            </Link>
            
            <Link 
              href="/queue" 
              style={{ 
                display: 'inline-block', 
                padding: '8px 14px', 
                backgroundColor: '#1877f2', 
                color: '#fff', 
                borderRadius: '8px', 
                textDecoration: 'none', 
                fontSize: '13px', 
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              📋 Lihat Senarai Queue / Jadual
            </Link>
          </div>

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

          {/* Pilihan Mod Pos */}
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
    </main>
  );
}
