'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export default function Home() {
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [message, setMessage] = useState('');
  const [mediaFile, setMediaFile] = useState(null); // Untuk gambar/video pos utama
  const [firstComment, setFirstComment] = useState('');
  const [firstCommentImage, setFirstCommentImage] = useState(null);
  const [postMode, setPostMode] = useState('now'); 
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPages, setFetchingPages] = useState(true);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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

    if (postMode === 'schedule' && !scheduledDateTime) {
      alert('Sila tetapkan tarikh dan masa untuk penjadualan.');
      return;
    }

    setLoading(true);
    
    const formData = new FormData();
    formData.append('pageIds', JSON.stringify(selectedPages));
    formData.append('message', message);
    if (mediaFile) {
      formData.append('mediaFile', mediaFile);
    }
    formData.append('firstComment', firstComment);
    if (firstCommentImage) {
      formData.append('firstCommentImage', firstCommentImage);
    }
    formData.append('postMode', postMode);
    if (postMode === 'schedule') {
      formData.append('scheduledAt', scheduledDateTime);
    }

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses permintaan.');

      alert(data.message || 'Berjaya!');
      setMessage('');
      setMediaFile(null);
      setFirstComment('');
      setFirstCommentImage(null);
      setScheduledDateTime('');

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
      
      {/* Header & Link ke Tetapan Timeslot di Sebelah Kiri */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
        <div>
          <h1 style={{ color: '#1877f2', margin: '0 0 8px 0' }}>Facebook Scheduler</h1>
          <p style={{ color: '#65676b', fontSize: '14px', margin: 0 }}>Hantar atau uruskan jadual pos anda dengan mudah.</p>
        </div>
        <div>
          <Link 
            href="/queue-settings" 
            style={{ 
              display: 'inline-block', 
              padding: '10px 16px', 
              backgroundColor: '#242526', 
              color: '#fff', 
              borderRadius: '8px', 
              textDecoration: 'none', 
              fontSize: '14px', 
              fontWeight: 'bold',
              border: '1px solid #3a3b3c',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            ⚙️ Update Time Slots
          </Link>
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

          {/* Muat Naik Media (Gambar/Video) untuk Pos Utama */}
          <div style={{ marginBottom: '15px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>Muat Naik Gambar / Video Pos:</label>
            <input 
              type="file" 
              accept="image/*,video/*"
              onChange={(e) => setMediaFile(e.target.files[0])}
              style={{ fontSize: '13px' }}
            />
            {mediaFile && (
              <p style={{ fontSize: '12px', color: '#28a745', marginTop: '5px' }}>Fail dipilih: {mediaFile.name}</p>
            )}
          </div>

          {/* Ruangan First Comment & Upload Gambar */}
          <div style={{ marginBottom: '15px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>First Comment (Pilihan):</label>
            <input 
              type="text" 
              value={firstComment} 
              onChange={(e) => setFirstComment(e.target.value)} 
              placeholder="Tulis komen pertama (cth: link produk di ruangan komen)..." 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', marginBottom: '10px' }} 
            />
            
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', color: '#555' }}>Muat Naik Gambar untuk First Comment:</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setFirstCommentImage(e.target.files[0])}
              style={{ fontSize: '13px' }}
            />
            {firstCommentImage && (
              <p style={{ fontSize: '12px', color: '#28a745', marginTop: '5px' }}>Fail dipilih: {firstCommentImage.name}</p>
            )}
          </div>
          
          <div style={{ margin: '15px 0', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <label style={{ cursor: 'pointer' }}><input type="radio" name="mode" checked={postMode === 'now'} onChange={() => setPostMode('now')} /> Pos Sekarang</label>
            <label style={{ cursor: 'pointer' }}><input type="radio" name="mode" checked={postMode === 'schedule'} onChange={() => setPostMode('schedule')} /> Jadual Manual</label>
            <label style={{ cursor: 'pointer' }}><input type="radio" name="mode" checked={postMode === 'queue'} onChange={() => setPostMode('queue')} /> <b>Auto-Queue Last</b></label>
          </div>

          {postMode === 'schedule' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px' }}>Pilih Tarikh & Masa:</label>
              <input type="datetime-local" value={scheduledDateTime} onChange={(e) => setScheduledDateTime(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading} 
            style={{ width: '100%', padding: '12px', background: postMode === 'queue' ? '#28a745' : '#0070f3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'Memproses...' : (postMode === 'queue' ? 'Auto-Queue Pos Ini' : (postMode === 'schedule' ? 'Jadualkan Pos' : 'Hantar Sekarang'))}
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
                    <td style={{ padding: '10px' }}>{new Date(p.scheduled_at).toLocaleString()}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                        backgroundColor: p.status === 'published' ? '#d4edda' : '#fff3cd',
                        color: p.status === 'published' ? '#155724' : '#856404'
                      }}>
                        {p.status.toUpperCase()}
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
