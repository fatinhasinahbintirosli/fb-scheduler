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

  // State Queue
  const [queueSlots, setQueueSlots] = useState([]);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => {
    async function initData() {
      const { data: pData } = await supabase.from('pages').select('*');
      const { data: sData } = await supabase.from('scheduled_posts').select('*').order('created_at', { ascending: false });
      const { data: qData } = await supabase.from('queue_settings').select('*');
      
      setPages(pData || []);
      setScheduledPosts(sData || []);
      setQueueSlots(qData || []);
    }
    initData();
  }, []);

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
    setLoading(true);
    
    const payload = {
      pageIds: selectedPages,
      message,
      postMode,
      scheduledAt: postMode === 'schedule' ? scheduledDateTime : null
    };

    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    alert(data.message || data.error);
    setLoading(false);
  };

  return (
    <main style={{ maxWidth: '900px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Facebook Scheduler</h1>

      {/* Bahagian Borang Pos */}
      <section style={{ background: '#f4f4f4', padding: '20px', borderRadius: '8px' }}>
        <form onSubmit={handleSubmit}>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Kapsyen..." style={{ width: '100%', height: '100px' }} />
          
          <div style={{ margin: '15px 0' }}>
            <label><input type="radio" name="mode" checked={postMode === 'now'} onChange={() => setPostMode('now')} /> Pos Sekarang</label>
            <label style={{ marginLeft: '15px' }}><input type="radio" name="mode" checked={postMode === 'schedule'} onChange={() => setPostMode('schedule')} /> Jadual Manual</label>
            <label style={{ marginLeft: '15px' }}><input type="radio" name="mode" checked={postMode === 'queue'} onChange={() => setPostMode('queue')} /> <b>Auto-Queue Last</b></label>
          </div>

          {postMode === 'schedule' && <input type="datetime-local" onChange={(e) => setScheduledDateTime(e.target.value)} style={{ display: 'block', marginBottom: '10px' }} />}
          
          <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '5px' }}>
            {loading ? 'Memproses...' : 'Hantar / Jadual'}
          </button>
        </form>
      </section>

      {/* Bahagian Queue Settings */}
      <section style={{ marginTop: '40px', background: '#1a1a1a', color: '#fff', padding: '20px', borderRadius: '8px' }}>
        <h2>Tetapan Waktu Queue (Auto-Queue)</h2>
        {queueSlots.map((slot, i) => (
          <div key={i} style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
            <select value={slot.day_of_week} onChange={(e) => updateSlot(i, 'day_of_week', e.target.value)} style={{ color: '#000' }}>
              {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
            </select>
            <input type="time" value={slot.time_slot.substring(0, 5)} onChange={(e) => updateSlot(i, 'time_slot', e.target.value)} style={{ color: '#000' }} />
            <button onClick={() => setQueueSlots(queueSlots.filter((_, idx) => idx !== i))} style={{ background: 'red', border: 'none', color: 'white' }}>X</button>
          </div>
        ))}
        <button onClick={addSlot}>+ Tambah Slot</button>
        <button onClick={saveQueueSettings} style={{ marginLeft: '10px', background: 'green', color: 'white' }}>Simpan Semua</button>
      </section>

      {/* Jadual Pos */}
      <section style={{ marginTop: '40px' }}>
        <h2>Senarai Pos</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#eee' }}><th>Mesej</th><th>Masa</th><th>Status</th></tr></thead>
          <tbody>
            {scheduledPosts.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #ccc' }}>
                <td>{p.message}</td>
                <td>{new Date(p.scheduled_at).toLocaleString()}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
