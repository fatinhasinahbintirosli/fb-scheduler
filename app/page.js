'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const DAYS = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

export default function QueueSettings() {
  const [slots, setSlots] = useState([]);
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => {
    async function fetchSlots() {
      const { data } = await supabase.from('queue_settings').select('*');
      setSlots(data || []);
    }
    fetchSlots();
  }, []);

  const addSlot = () => {
    setSlots([...slots, { day_of_week: 0, time_slot: '09:00:00' }]);
  };

  const updateSlot = (index, field, value) => {
    const newSlots = [...slots];
    newSlots[index][field] = field === 'day_of_week' ? parseInt(value) : value + ':00';
    setSlots(newSlots);
  };

  const saveSettings = async () => {
    await supabase.from('queue_settings').delete().neq('id', 0);
    const { error } = await supabase.from('queue_settings').insert(slots);
    if (error) alert("Gagal simpan: " + error.message);
    else alert("Jadual Queue disimpan!");
  };

  return (
    <div style={{ padding: '20px', background: '#1a1a1a', color: '#fff', borderRadius: '12px' }}>
      <h2>Tetapan Waktu Queue (Hari & Masa)</h2>
      
      {slots.map((slot, index) => (
        <div key={index} style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
          <select value={slot.day_of_week} onChange={(e) => updateSlot(index, 'day_of_week', e.target.value)}>
            {DAYS.map((day, i) => <option key={i} value={i}>{day}</option>)}
          </select>
          
          <input 
            type="time" 
            value={slot.time_slot.substring(0, 5)} 
            onChange={(e) => updateSlot(index, 'time_slot', e.target.value)}
            style={{ color: '#000' }}
          />
          
          <button onClick={() => setSlots(slots.filter((_, i) => i !== index))} style={{ background: 'red', border: 'none', color: 'white' }}>X</button>
        </div>
      ))}
      
      <button onClick={addSlot} style={{ marginTop: '10px', padding: '5px 15px' }}>+ Tambah Slot</button>
      <button onClick={saveSettings} style={{ marginTop: '10px', marginLeft: '10px', padding: '5px 15px', background: 'green', color: 'white' }}>Simpan Semua</button>
    </div>
  );
}
