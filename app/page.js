'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const DAYS = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

export default function Home() {
  // State Utama
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [message, setMessage] = useState('');
  const [mediaType, setMediaType] = useState('none');
  const [postMode, setPostMode] = useState('now'); 
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPages, setFetchingPages] = useState(true);

  // State Queue
  const [queueSlots, setQueueSlots] = useState([]);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => {
    async function initData() {
      try {
        const { data: pData } = await supabase.from('pages').select('page_id, page_name').order('page_name', { ascending: true });
        const { data: sData } = await supabase.from('scheduled_posts').select('*').order('created_at', { ascending: false });
        const { data: qData } = await supabase.from('queue_settings').select('*');
        
        setPages(pData || []);
        setScheduledPosts(sData || []);
        setQueueSlots(qData || []);
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

  // --- Fungsi Queue ---
  const addSlot = () => setQueueSlots([...queueSlots, { day_of_week: 0, time_slot: '09:00:00' }]);
  const updateSlot = (index, field, value) => {
    const newSlots = [...queueSlots];
    newSlots[index][field] = field === 'day_of_week' ? parseInt(value) : (value.length === 5 ? value + ':00' : value);
    setQueueSlots(newSlots);
  };
  const saveQueueSettings = async () => {
    await supabase.from('queue_settings').delete().neq('id', 0);
    await supabase.from('queue_settings').insert(queueSlots);
    alert('Jadual Queue disimpan!');
  };

  // --- Fungsi Hantar ---
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
    
    const payload = {
      pageIds: selectedPages,
      message,
      postMode,
      scheduledAt: postMode === 'schedule' ? scheduledDateTime : null
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
      setScheduledDateTime('');

      // Refresh senarai pos berjadual
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
      <h1 style={{ color: '#1877f2' }}>Facebook Scheduler</h1>

      {/* Bahagian Borang Pos */}
      <section style={{ background: '#f4f4f4', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <form onSubmit={handleSubmit}>
          
          {/* Pemilihan Page */}
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

          {/* Kapsyen */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Kapsyen Pos:</label>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Tulis kapsyen anda di sini..." 
              style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
            />
          </div>
          
          {/* Mod Pos */}
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

      {/* Bahagian Queue Settings */}
      <section style={{ background: '#1a1a1a', color: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h2>Tetapan Waktu Queue (Auto-Queue)</h2>
        <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '15px' }}>Tetapkan hari dan masa pilihan anda untuk fungsi Auto-Queue Last.</p>
        
        {queueSlots.map((slot, i) => (
          <div key={i} style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={slot.day_of_week} onChange={(e) => updateSlot(i, 'day_of_week', e.target.value)} style={{ padding: '6px', borderRadius: '4px' }}>
              {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
            </select>
            <input type="time" value={slot.time_slot.substring(0, 5)} onChange={(e) => updateSlot(i, 'time_slot', e.target.value)} style={{ padding: '6px', borderRadius: '4px' }} />
            <button onClick={() => setQueueSlots(queueSlots.filter((_, idx) => idx !== i))} style={{ background: 'red', border: 'none', color: 'white', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>Padam</button>
          </div>
        ))}
        
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button onClick={addSlot} style={{ padding: '8px 12px', background: '#444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Tambah Slot</button>
          <button onClick={saveQueueSettings} style={{ padding: '8px 12px', background: 'green', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Simpan Semua</button>
        </div>
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
