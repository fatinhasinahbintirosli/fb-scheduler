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
  const [postMode, setPostMode] = useState('now'); 
  const [message, setMessage] = useState('');
  const [currentProfile, setCurrentProfile] = useState('Fatin'); // Profil pilihan
  const [loading, setLoading] = useState(false);
  const [fetchingPages, setFetchingPages] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    // Ambil profil yang tersimpan di pelayar (localStorage)
    const savedProfile = localStorage.getItem('fb_scheduler_profile');
    if (savedProfile) setCurrentProfile(savedProfile);

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

  const handleProfileChange = (profileName) => {
    setCurrentProfile(profileName);
    localStorage.setItem('fb_scheduler_profile', profileName);
  };

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
      profile: currentProfile, // Hantar profil semasa
    };

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
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
      
      {/* Bahagian Pilih Profil */}
      <div style={{ background: '#e7f3ff', padding: '15px 20px', borderRadius: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #b6d4fe' }}>
        <div>
          <span style={{ fontWeight: 'bold', color: '#084298', marginRight: '10px' }}>👤 Profil Pengguna Semasa:</span>
          <strong style={{ color: '#052c65', fontSize: '16px' }}>{currentProfile}</strong>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => handleProfileChange('Fatin')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: currentProfile === 'Fatin' ? '#0d6efd' : '#fff',
              color: currentProfile === 'Fatin' ? '#fff' : '#0d6efd',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            Profil Fatin
          </button>
          <button
            type="button"
            onClick={() => handleProfileChange('Adik')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: currentProfile === 'Adik' ? '#198754' : '#fff',
              color: currentProfile === 'Adik' ? '#fff' : '#198754',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            Profil Adik
          </button>
        </div>
      </div>

      {/* Header & Navigasi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <Link 
              href="/queue-settings" 
              style={{ padding: '8px 14px', backgroundColor: '#242526', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}
            >
              ⚙️ Update Time Slots ({currentProfile})
            </Link>
            <Link 
              href="/queue" 
              style={{ padding: '8px 14px', backgroundColor: '#1877f2', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}
            >
              📋 Lihat Senarai Queue / Jadual
            </Link>
          </div>

          <h1 style={{ color: '#1877f2', margin: '0 0 8px 0' }}>Facebook Scheduler</h1>
          <p style={{ color: '#65676b', fontSize: '14px', margin: 0 }}>Sistem penjadualan pos automatik mengikut profil.</p>
        </div>
      </div>

      {/* Borang Utama */}
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

          {/* Medan lain (Image, Video, First Comment) seperti biasa */}
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

          {/* Mod Pos */}
          <div style={{ marginBottom: '15px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              <input type="radio" name="postMode" checked={postMode === 'now'} onChange={() => { setPostMode('now'); setScheduledAt(''); }} />
              Pos Sekarang
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              <input type="radio" name="postMode" checked={postMode === 'manual'} onChange={() => setPostMode('manual')} />
              Jadual Manual
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              <input type="radio" name="postMode" checked={postMode === 'auto'} onChange={() => { setPostMode('auto'); setScheduledAt(''); }} />
              Auto-Queue Last ({currentProfile})
            </label>
          </div>

          {postMode === 'manual' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Pilih Masa Jadual:</label>
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading} 
            style={{ width: '100%', padding: '12px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'Memproses...' : (postMode === 'now' ? 'Hantar Sekarang' : `Masukkan ke Auto-Queue (${currentProfile})`)}
          </button>
        </form>
      </section>
    </main>
  );
}
