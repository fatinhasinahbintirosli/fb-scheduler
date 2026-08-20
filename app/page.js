'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function Home() {
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [message, setMessage] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingPages, setFetchingPages] = useState(true);

  // Ambil senarai Facebook Pages dari Supabase
  useEffect(() => {
    async function fetchPages() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          console.warn('Supabase URL atau Key belum ditetapkan.');
          setFetchingPages(false);
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from('pages')
          .select('page_id, page_name')
          .order('page_name', { ascending: true });

        if (error) throw error;
        setPages(data || []);
      } catch (err) {
        console.error('Ralat memuatkan senarai Page:', err);
      } finally {
        setFetchingPages(false);
      }
    }
    fetchPages();
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

    if (!message && !mediaUrl) {
      alert('Sila masukkan teks kapsyen atau pautan media.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        pageIds: selectedPages,
        message: message,
        imageUrl: mediaType === 'image' ? mediaUrl.trim() : null,
        videoUrl: mediaType === 'video' ? mediaUrl.trim() : null,
        firstComment: firstComment.trim() || null,
      };

      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghantar pos.');
      }

      let successCount = 0;
      let errorMessages = [];

      data.results.forEach((item) => {
        if (item.success) {
          successCount++;
          if (item.commentError) {
            errorMessages.push(`${item.page}: Pos berjaya, tapi ralat komen (${item.commentError})`);
          }
        } else {
          errorMessages.push(`${item.page}: Gagal (${item.error})`);
        }
      });

      if (errorMessages.length === 0) {
        alert(`Berjaya! Pos dan komen diterbitkan ke ${successCount} Page.`);
        setMessage('');
        setMediaUrl('');
        setFirstComment('');
      } else {
        alert(
          `Selesai dengan beberapa makluman:\n\n` +
          `Berjaya: ${successCount}/${pages.length}\n` +
          errorMessages.join('\n')
        );
      }
    } catch (err) {
      alert(`Ralat: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: '750px', margin: '40px auto', padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#1877f2' }}>Facebook Post & Video Scheduler</h1>
      <p style={{ color: '#65676b', marginBottom: '24px', fontSize: '14px' }}>Hantar pos gambar, video berserta auto first comment serentak ke semua Facebook Page.</p>

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
            <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>Mesej / Kapsyen Pos:</label>
          <textarea
            rows="4"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tulis kapsyen pos anda di sini..."
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Jenis Media:</label>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '8px' }}>
            <label style={{ cursor: 'pointer', fontSize: '14px' }}>
              <input
                type="radio"
                name="mediaType"
                value="image"
                checked={mediaType === 'image'}
                onChange={() => setMediaType('image')}
                style={{ marginRight: '6px' }}
              />
              Gambar (Image URL)
            </label>
            <label style={{ cursor: 'pointer', fontSize: '14px' }}>
              <input
                type="radio"
                name="mediaType"
                value="video"
                checked={mediaType === 'video'}
                onChange={() => setMediaType('video')}
                style={{ marginRight: '6px' }}
              />
              Video (.mp4 / direct URL)
            </label>
            <label style={{ cursor: 'pointer', fontSize: '14px' }}>
              <input
                type="radio"
                name="mediaType"
                value="none"
                checked={mediaType === 'none'}
                onChange={() => setMediaType('none')}
                style={{ marginRight: '6px' }}
              />
              Tiada Media (Teks Sahaja)
            </label>
          </div>

          {mediaType !== 'none' && (
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder={mediaType === 'image' ? "https://example.com/gambar.jpg" : "https://example.com/video.mp4"}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px' }}
            />
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>First Comment (Pilihan):</label>
          <textarea
            rows="3"
            value={firstComment}
            onChange={(e) => setFirstComment(e.target.value)}
            placeholder="Komen pertama yang akan dipos automatik..."
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: loading ? '#93c5fd' : '#1877f2',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Sedang Memproses Pos...' : 'Hantar Pos Sekarang'}
        </button>
      </form>
    </main>
  );
}
