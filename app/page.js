'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [postText, setPostText] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentFile, setCommentFile] = useState(null);
  const [commentPreview, setCommentPreview] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadPages() {
      const { data } = await supabase.from('pages').select('*').eq('is_active', true);
      if (data) setPages(data);
    }
    loadPages();
  }, []);

  const toggleSelectAll = () => {
    if (selectedPages.length === pages.length) setSelectedPages([]);
    else setSelectedPages(pages.map((p) => p.page_id));
  };

  const togglePage = (id) => {
    setSelectedPages((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleUpload = async (file) => {
    if (!file) return null;
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `${Date.now()}-${cleanName}`;
    const { error } = await supabase.storage.from('post-media').upload(fileName, file);
    if (error) {
      console.error('Storage Upload Error:', error);
      return null;
    }
    const { data: publicData } = supabase.storage.from('post-media').getPublicUrl(fileName);
    return publicData.publicUrl;
  };

  const handlePublish = async () => {
    if (selectedPages.length === 0) return alert('Sila pilih sekurang-kurangnya 1 Page!');
    setLoading(true);

    const mediaUrl = await handleUpload(mediaFile);
    const commentImageUrl = await handleUpload(commentFile);
    const targetPages = pages.filter((p) => selectedPages.includes(p.page_id));

    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pages: targetPages,
        message: postText,
        mediaUrl,
        commentText,
        commentImageUrl
      })
    });

    const result = await res.json();
    setLoading(false);

    if (!result.success) {
      return alert('Ralat Sistem: ' + result.error);
    }

    const failedPosts = result.results.filter((r) => !r.success);
    const failedComments = result.results.filter((r) => r.success && !r.commentSuccess);

    if (failedPosts.length > 0) {
      alert('Ralat Pos Facebook:\n' + failedPosts.map((e) => `${e.page}: ${e.error}`).join('\n'));
    } else if (failedComments.length > 0) {
      alert('Pos Berjaya, tetapi Ralat pada Komen:\n' + failedComments.map((e) => `${e.page}: ${e.commentError}`).join('\n'));
    } else {
      alert('Semua Pos & Komen Pertama berjaya diterbitkan!');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif', background: '#f0f2f5' }}>
      {/* Panel Kiri */}
      <div style={{ flex: 1, padding: '24px', borderRight: '1px solid #ddd', overflowY: 'auto' }}>
        <h2>Facebook Multi-Page Scheduler</h2>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong>Pilih Pages ({selectedPages.length}/{pages.length})</strong>
            <button onClick={toggleSelectAll} style={{ fontSize: '12px' }}>Pilih Semua</button>
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {pages.map((p) => (
              <label key={p.page_id} style={{ display: 'block', margin: '4px 0' }}>
                <input
                  type="checkbox"
                  checked={selectedPages.includes(p.page_id)}
                  onChange={() => togglePage(p.page_id)}
                />{' '}
                {p.page_name}
              </label>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
          <label><strong>Kandungan Pos Utama:</strong></label>
          <textarea
            rows="4"
            style={{ width: '100%', marginTop: '6px' }}
            placeholder="Tulis sesuatu..."
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            style={{ marginTop: '8px' }}
            onChange={(e) => {
              if (e.target.files[0]) {
                setMediaFile(e.target.files[0]);
                setMediaPreview(URL.createObjectURL(e.target.files[0]));
              }
            }}
          />
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
          <label><strong>Auto First Comment:</strong></label>
          <textarea
            rows="3"
            style={{ width: '100%', marginTop: '6px' }}
            placeholder="Tulis komen pertama (link affiliate, Shopee, dsb)..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            style={{ marginTop: '8px' }}
            onChange={(e) => {
              if (e.target.files[0]) {
                setCommentFile(e.target.files[0]);
                setCommentPreview(URL.createObjectURL(e.target.files[0]));
              }
            }}
          />
        </div>

        <button
          onClick={handlePublish}
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#1877f2', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? 'Sedang Menerbitkan...' : 'Terbitkan Sekarang'}
        </button>
      </div>

      {/* Panel Kanan */}
      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h3 style={{ alignSelf: 'flex-start' }}>Pratonton (Live Preview)</h3>
        <div style={{ width: '450px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '40px', height: '40px', background: '#0866ff', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>FB</div>
            <div>
              <div style={{ fontWeight: 'bold' }}>{selectedPages.length > 0 ? `${selectedPages.length} Pages Terpilih` : 'Nama Page'}</div>
              <div style={{ fontSize: '12px', color: '#65676b' }}>Baru sebentar tadi · 🌐</div>
            </div>
          </div>
          <div style={{ padding: '0 12px 12px 12px', whiteSpace: 'pre-wrap' }}>{postText || 'Kandungan teks pos akan dipaparkan di sini...'}</div>
          {mediaPreview && <img src={mediaPreview} alt="Preview" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} />}

          {(commentText || commentPreview) && (
            <div style={{ background: '#f0f2f5', padding: '12px', borderTop: '1px solid #e4e6eb' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#65676b', marginBottom: '6px' }}>Komen Pertama (Auto-Comment):</div>
              <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '18px', display: 'inline-block', maxWidth: '85%' }}>
                <span style={{ fontSize: '13px' }}>{commentText}</span>
                {commentPreview && <img src={commentPreview} alt="Comment Preview" style={{ display: 'block', width: '100%', maxHeight: '120px', borderRadius: '8px', marginTop: '6px' }} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
