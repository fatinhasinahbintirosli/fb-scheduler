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
  const [postMode, setPostMode] = useState('now'); 
  const [currentProfile, setCurrentProfile] = useState('Fatin');
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedPages.length === 0) return alert('Sila pilih sekurang-kurangnya satu Facebook Page.');

    setLoading(true);
    const payload = {
      pageIds: selectedPages,
      message,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
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
      // Reset form
      setMessage(''); setImageUrl(''); setVideoUrl(''); setFirstComment(''); setCommentImageUrl('');
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
          <button onClick={() => handleProfileChange('Fatin')} style={{ padding: '5px 10px', background: currentProfile === 'Fatin' ? '#0d6efd' : '#fff', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>Profil Fatin</button>
          <button onClick={() => handleProfileChange('Adik')} style={{ padding: '5px 10px', background: currentProfile === 'Adik' ? '#198754' : '#fff', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>Profil Adik</button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <Link href="/queue-settings" style={{ marginRight: '10px', padding: '8px', background: '#333', color: '#fff', borderRadius: '5px', textDecoration: 'none' }}>⚙️ Update Time Slots ({currentProfile})</Link>
        <Link href="/queue" style={{ padding: '8px', background: '#1877f2', color: '#fff', borderRadius: '5px', textDecoration: 'none' }}>📋 Lihat Senarai Queue</Link>
      </div>

      <h1 style={{ color: '#1877f2' }}>Facebook Scheduler</h1>

      <form onSubmit={handleSubmit} style={{ background: '#f4f4f4', padding: '20px', borderRadius: '8px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold' }}>Pilih Pages ({selectedPages.length}/{pages.length}):</label>
          <button type="button" onClick={handleSelectAll} style={{ marginLeft: '10px', fontSize: '12px' }}>Pilih Semua</button>
          <div style={{ height: '150px', overflowY: 'auto', background: '#fff', padding: '10px', border: '1px solid #ccc', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {pages.map(p => (
              <label key={p.page_id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="checkbox" checked={selectedPages.includes(p.page_id)} onChange={() => handlePageToggle(p.page_id)} />
                {p.page_name}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold' }}>Kapsyen:</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} style={{ width: '100%', height: '80px' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ fontWeight: 'bold' }}>Image URL:</label>
            <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontWeight: 'bold' }}>Video URL:</label>
            <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold' }}>First Comment:</label>
          <textarea value={firstComment} onChange={e => setFirstComment(e.target.value)} style={{ width: '100%', height: '50px' }} />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold' }}>Comment Image URL:</label>
          <input type="text" value={commentImageUrl} onChange={e => setCommentImageUrl(e.target.value)} style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ marginRight: '15px' }}><input type="radio" checked={postMode === 'now'} onChange={() => setPostMode('now')} /> Pos Sekarang</label>
          <label style={{ marginRight: '15px' }}><input type="radio" checked={postMode === 'manual'} onChange={() => setPostMode('manual')} /> Jadual Manual</label>
          <label><input type="radio" checked={postMode === 'auto'} onChange={() => setPostMode('auto')} /> Auto-Queue Last ({currentProfile})</label>
        </div>

        {postMode === 'manual' && <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ marginBottom: '15px' }} />}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#0070f3', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Memproses...' : 'Hantar Sekarang'}
        </button>
      </form>
    </main>
  );
}
