'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export default function Home() {
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [commentImageUrl, setCommentImageUrl] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [postMode, setPostMode] = useState('now'); 
  const [currentProfile, setCurrentProfile] = useState('Fatin');
  const [loading, setLoading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [fetchingPages, setFetchingPages] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    const savedProfile = localStorage.getItem('fb_scheduler_profile') || 'Fatin';
    setCurrentProfile(savedProfile);

    async function initData() {
      const { data: pData } = await supabase.from('pages').select('page_id, page_name').order('page_name', { ascending: true });
      setPages(pData || []);
      setFetchingPages(false);
    }
    initData();
  }, []);

  const handleProfileChange = (profileName) => {
    setCurrentProfile(profileName);
    localStorage.setItem('fb_scheduler_profile', profileName);
  };

  const handleSelectAll = () => {
    setSelectedPages(selectedPages.length === pages.length ? [] : pages.map(p => p.page_id));
  };

  const handlePageToggle = (pageId) => {
    setSelectedPages(selectedPages.includes(pageId) ? selectedPages.filter(id => id !== pageId) : [...selectedPages, pageId]);
  };

  // Fungsi untuk memuat naik fail ke Supabase Storage (telah dibetulkan ralat sintaks)
  const handleFileUpload = async (e, setUrlState) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    // Pastikan anda sudah buat bucket bernama 'post-media' di Supabase Storage
    const { error } = await supabase.storage
      .from('post-media')
      .upload(fileName, file);

    if (error) {
      alert('Gagal memuat naik fail: ' + error.message);
    } else {
      const { data: publicUrlData } = supabase.storage.from('post-media').getPublicUrl(fileName);
      setUrlState(publicUrlData.publicUrl);
    }
    setFileUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedPages.length === 0) return alert('Sila pilih sekurang-kurangnya satu Facebook Page.');

    setLoading(true);
    
    let finalImageUrl = imageUrl || null;
    let finalVideoUrl = null;

    if (finalImageUrl) {
      const lowerUrl = finalImageUrl.toLowerCase();
      if (lowerUrl.endsWith('.mp4') || lowerUrl.includes('video') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm')) {
        finalVideoUrl = finalImageUrl;
        finalImageUrl = null;
      }
    }

    const payload = {
      pageIds: selectedPages,
      message,
      imageUrl: finalImageUrl,
      videoUrl: finalVideoUrl,
      firstComment: firstComment || null,
      commentImageUrl: commentImageUrl || null,
      scheduledAt: postMode === 'auto' ? 'auto-queue' : (scheduledAt || null),
      profile: currentProfile,
    };

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message || 'Berjaya!');
      
      // Reset borang
      setMessage(''); 
      setImageUrl(''); 
      setFirstComment(''); 
      setCommentImageUrl('');
    } catch (err) {
      alert(`Ralat: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: '900px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* Profil Selector */}
      <div style={{ background: '#e7f3ff', padding: '15px', borderRadius: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><strong>👤 Profil Pengguna Semasa:</strong> {currentProfile}</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={() => handleProfileChange('Fatin')} style={{ padding: '6px 12px', background: currentProfile === 'Fatin' ? '#0d6efd' : '#fff', color: currentProfile === 'Fatin' ? '#fff' : '#000', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Profil Fatin</button>
          <button type="button" onClick={() => handleProfileChange('Adik')} style={{ padding: '6px 12px', background: currentProfile === 'Adik' ? '#198754' : '#fff', color: currentProfile === 'Adik' ? '#fff' : '#000', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Profil Adik</button>
        </div>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <Link href="/queue-settings" style={{ padding: '8px 14px', background: '#333', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>⚙️ Update Time Slots ({currentProfile})</Link>
        <Link href="/queue" style={{ padding: '8px 14px', background: '#1877f2', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>📋 Lihat Senarai Queue</Link>
      </div>

      <h1 style={{ color: '#1877f2' }}>Facebook Scheduler</h1>

      <form onSubmit={handleSubmit} style={{ background: '#f4f4f4', padding: '20px', borderRadius: '8px' }}>
        
        {/* Pilih Pages */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontWeight: 'bold' }}>Pilih Pages ({selectedPages.length}/{pages.length}):</label>
            <button type="button" onClick={handleSelectAll} style={{ fontSize: '12px', background: 'none', border: 'none', color: '#1877f2', cursor: 'pointer', textDecoration: 'underline' }}>
              {selectedPages.length === pages.length ? 'Nyahpilih Semua' : 'Pilih Semua'}
            </button>
          </div>
          {fetchingPages ? (
            <p style={{ fontSize: '13px' }}>Memuatkan senarai page...</p>
          ) : (
            <div style={{ height: '150px', overflowY: 'auto', background: '#fff', padding: '10px', border: '1px solid #ccc', borderRadius: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {pages.map(p => (
                <label key={p.page_id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedPages.includes(p.page_id)} onChange={() => handlePageToggle(p.page_id)} />
                  {p.page_name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Kapsyen */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Kapsyen:</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tulis kapsyen pos anda..." style={{ width: '100%', height: '90px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        {/* Upload Media Utama (Gambar / Video) */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Upload Gambar / Video Utama (Pilihan):</label>
          <input 
            type="file" 
            accept="image/*,video/*"
            onChange={(e) => handleFileUpload(e, setImageUrl)} 
            disabled={fileUploading}
            style={{ marginBottom: '5px', display: 'block' }} 
          />
          <input 
            type="text" 
            value={imageUrl} 
            onChange={e => setImageUrl(e.target.value)} 
            placeholder="Atau salin/tampal URL gambar/video di sini..." 
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} 
          />
          {fileUploading && <small style={{ color: '#0d6efd' }}>Sedang memuat naik fail ke storage...</small>}
        </div>

        {/* First Comment */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>First Comment (Komen Pertama):</label>
          <textarea value={firstComment} onChange={e => setFirstComment(e.target.value)} placeholder="Tulis komen pertama (pilihan)..." style={{ width: '100%', height: '60px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        {/* Comment Image URL */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Upload Gambar untuk First Comment (Pilihan):</label>
          <input 
            type="file" 
            accept="image/*"
            onChange={(e) => handleFileUpload(e, setCommentImageUrl)} 
            disabled={fileUploading}
            style={{ marginBottom: '5px', display: 'block' }} 
          />
          <input 
            type="text" 
            value={commentImageUrl} 
            onChange={e => setCommentImageUrl(e.target.value)} 
            placeholder="Atau masukkan URL gambar komen..." 
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} 
          />
        </div>

        {/* Pilihan Mod Hantaran */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            <input type="radio" name="postMode" checked={postMode === 'now'} onChange={() => { setPostMode('now'); setScheduledAt(''); }} /> Pos Sekarang
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            <input type="radio" name="postMode" checked={postMode === 'manual'} onChange={() => setPostMode('manual')} /> Jadual Manual
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            <input type="radio" name="postMode" checked={postMode === 'auto'} onChange={() => { setPostMode('auto'); setScheduledAt(''); }} /> Auto-Queue Last ({currentProfile})
          </label>
        </div>

        {postMode === 'manual' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Pilih Tarikh & Masa:</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || fileUploading} 
          style={{ width: '100%', padding: '12px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
        >
          {loading ? 'Memproses...' : (postMode === 'now' ? 'Hantar Sekarang' : `Masukkan ke Auto-Queue (${currentProfile})`)}
        </button>
      </form>
    </main>
  );
}
