'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function Home() {
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [message, setMessage] = useState('');
  const [mediaType, setMediaType] = useState('none'); // 'none', 'image', 'video'
  
  // State Fail & URL Media Utama
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [uploadMethod, setUploadMethod] = useState('direct'); // 'direct' atau 'url'

  // State First Comment
  const [firstComment, setFirstComment] = useState('');
  const [commentImageFile, setCommentImageFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [fetchingPages, setFetchingPages] = useState(true);
  const [uploadStatus, setUploadStatus] = useState('');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Ambil senarai Facebook Pages dari Supabase
  useEffect(() => {
    async function fetchPages() {
      try {
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

  // Fungsi muat naik fail ke bucket 'post-media'
  const uploadToStorage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('post-media')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Gagal muat naik fail: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('post-media').getPublicUrl(filePath);
    return data.publicUrl;
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

    if (!message && mediaType === 'none' && !mediaFile && !mediaUrlInput) {
      alert('Sila masukkan teks kapsyen atau pilih fail media.');
      return;
    }

    setLoading(true);
    setUploadStatus('Memproses fail...');

    try {
      let finalImageUrl = null;
      let finalVideoUrl = null;
      let finalCommentImageUrl = null;

      // 1. Muat naik Media Utama
      if (mediaType !== 'none') {
        if (uploadMethod === 'direct' && mediaFile) {
          setUploadStatus(`Sedang memuat naik ${mediaType} ke Supabase...`);
          const uploadedUrl = await uploadToStorage(mediaFile);
          if (mediaType === 'image') finalImageUrl = uploadedUrl;
          if (mediaType === 'video') finalVideoUrl = uploadedUrl;
        } else if (uploadMethod === 'url' && mediaUrlInput) {
          if (mediaType === 'image') finalImageUrl = mediaUrlInput.trim();
          if (mediaType === 'video') finalVideoUrl = mediaUrlInput.trim();
        }
      }

      // 2. Muat naik Gambar First Comment
      if (commentImageFile) {
        setUploadStatus('Sedang memuat naik gambar First Comment...');
        finalCommentImageUrl = await uploadToStorage(commentImageFile);
      }

      setUploadStatus('Menerbitkan pos ke Facebook...');

      const payload = {
        pageIds: selectedPages,
        message: message,
        imageUrl: finalImageUrl,
        videoUrl: finalVideoUrl,
        firstComment: firstComment.trim() || null,
        commentImageUrl: finalCommentImageUrl,
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
            errorMessages.push(`${item.page}: Pos berjaya, ralat komen (${item.commentError})`);
          }
        } else {
          errorMessages.push(`${item.page}: Gagal (${item.error})`);
        }
      });

      if (errorMessages.length === 0) {
        alert(`Berjaya! Pos dan First Comment diterbitkan ke ${successCount} Page.`);
        setMessage('');
        setMediaFile(null);
        setMediaUrlInput('');
        setFirstComment('');
        setCommentImageFile(null);
      } else {
        alert(
          `Selesai dengan makluman:\n\n` +
          `Berjaya: ${successCount}/${pages.length}\n` +
          errorMessages.join('\n')
        );
      }
    } catch (err) {
      alert(`Ralat: ${err.message}`);
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  };

  return (
    <main style={{ maxWidth: '750px', margin: '40px auto', padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#1877f2' }}>Facebook Post & Video Scheduler</h1>
      <p style={{ color: '#65676b', marginBottom: '24px', fontSize: '14px' }}>Hantar pos teks, gambar, video serta komen pertama serentak ke semua Facebook Page.</p>

      <form onSubmit={handleSubmit}>
        {/* Bahagian Pemilihan Page */}
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

        {/* Bahagian Kapsyen Pos */}
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

        {/* Bahagian Media Utama */}
        <div style={{ marginBottom: '16px', padding: '14px', backgroundColor: '#f7f8fa', borderRadius: '8px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Media Utama Pos:</label>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            <label style={{ cursor: 'pointer', fontSize: '14px' }}>
              <input type="radio" name="mediaType" value="none" checked={mediaType === 'none'} onChange={() => setMediaType('none')} style={{ marginRight: '6px' }} />
              Teks Sahaja
            </label>
            <label style={{ cursor: 'pointer', fontSize: '14px' }}>
              <input type="radio" name="mediaType" value="image" checked={mediaType === 'image'} onChange={() => setMediaType('image')} style={{ marginRight: '6px' }} />
              Gambar
            </label>
            <label style={{ cursor: 'pointer', fontSize: '14px' }}>
              <input type="radio" name="mediaType" value="video" checked={mediaType === 'video'} onChange={() => setMediaType('video')} style={{ marginRight: '6px' }} />
              Video
            </label>
          </div>

          {mediaType !== 'none' && (
            <div>
              <div style={{ display: 'flex', gap: '14px', marginBottom: '8px', fontSize: '13px' }}>
                <label style={{ cursor: 'pointer' }}>
                  <input type="radio" name="uploadMethod" value="direct" checked={uploadMethod === 'direct'} onChange={() => setUploadMethod('direct')} style={{ marginRight: '4px' }} />
                  Direct Upload Fail (PC / Phone)
                </label>
                <label style={{ cursor: 'pointer' }}>
                  <input type="radio" name="uploadMethod" value="url" checked={uploadMethod === 'url'} onChange={() => setUploadMethod('url')} style={{ marginRight: '4px' }} />
                  Guna URL
                </label>
              </div>

              {uploadMethod === 'direct' ? (
                <input
                  type="file"
                  accept={mediaType === 'image' ? 'image/*' : 'video/mp4,video/quicktime'}
                  onChange={(e) => setMediaFile(e.target.files[0])}
                  style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                />
              ) : (
                <input
                  type="url"
                  value={mediaUrlInput}
                  onChange={(e) => setMediaUrlInput(e.target.value)}
                  placeholder={mediaType === 'image' ? 'https://example.com/gambar.jpg' : 'https://example.com/video.mp4'}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px' }}
                />
              )}
            </div>
          )}
        </div>

        {/* Bahagian First Comment */}
        <div style={{ marginBottom: '24px', padding: '14px', backgroundColor: '#f0f7ff', borderRadius: '8px', border: '1px solid #cce3ff' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '14px', color: '#0056b3' }}>Auto First Comment (Pilihan):</label>
          <textarea
            rows="3"
            value={firstComment}
            onChange={(e) => setFirstComment(e.target.value)}
            placeholder="Tulis komen pertama automatik..."
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #b8daff', boxSizing: 'border-box', fontSize: '14px', marginBottom: '10px' }}
          />

          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '13px', color: '#0056b3' }}>Lampirkan Gambar pada Komen (Pilihan):</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCommentImageFile(e.target.files[0])}
            style={{ width: '100%', fontSize: '13px' }}
          />
        </div>

        {/* Butang Submit */}
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
          {loading ? (uploadStatus || 'Sedang Memproses...') : 'Hantar Pos Sekarang'}
        </button>
      </form>
    </main>
  );
}
