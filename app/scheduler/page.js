'use client';

import React, { useState } from 'react';

export default function FacebookScheduler() {
  // Contoh state ringkas untuk simulasi muka depan scheduler
  const [currentProfile, setCurrentProfile] = useState('Fatin');
  const [message, setMessage] = useState('');
  const [selectedPages, setSelectedPages] = useState([]);

  const handleLogout = () => {
    // Padam data sesi / token simpanan tempatan (jika ada)
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    // Lakukan lencongan (redirect) ke halaman utama atau log masuk
    window.location.href = '/';
  };

  return (
    <main style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1f2937', lineHeight: '1.6', margin: 0, padding: '20px', background: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* Bar Atas: Profil & Navigasi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#fff', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>👤 Profil Pengguna Semasa:</span>
          <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '15px', fontSize: '14px', fontWeight: 'bold' }}>
            {currentProfile}
          </span>
          <div style={{ display: 'flex', gap: '5px', marginLeft: '15px' }}>
            <button onClick={() => setCurrentProfile('Fatin')} style={{ padding: '4px 10px', fontSize: '12px', cursor: 'pointer', background: currentProfile === 'Fatin' ? '#2563eb' : '#e5e7eb', color: currentProfile === 'Fatin' ? '#fff' : '#333', border: 'none', borderRadius: '4px' }}>Profil Fatin</button>
            <button onClick={() => setCurrentProfile('Adik')} style={{ padding: '4px 10px', fontSize: '12px', cursor: 'pointer', background: currentProfile === 'Adik' ? '#2563eb' : '#e5e7eb', color: currentProfile === 'Adik' ? '#fff' : '#333', border: 'none', borderRadius: '4px' }}>Profil Adik</button>
          </div>
        </div>

        {/* Bahagian Butang Navigasi & Log Keluar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a 
            href="/" 
            style={{ background: '#4b5563', color: '#fff', padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold', display: 'inline-block' }}
          >
            🏠 Laman Utama
          </a>
          <button 
            onClick={handleLogout}
            style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            🚪 Log Keluar
          </button>
        </div>
      </div>

      {/* Butang Tindakan Pantas */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button style={{ background: '#374151', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
          ⚙️ Update Time Slots ({currentProfile})
        </button>
        <button style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
          📋 Lihat Senarai Queue
        </button>
      </div>

      <h1 style={{ color: '#2563eb', fontSize: '28px', marginBottom: '20px' }}>Facebook Scheduler</h1>

      {/* Kotak Utama Borang */}
      <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
        
        {/* Pilih Pages */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Pilih Pages (0/25):</label>
            <span style={{ color: '#2563eb', fontSize: '13px', cursor: 'pointer' }}>Pilih Semua</span>
          </div>
          <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '15px', maxHeight: '180px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#fafafa' }}>
            {['Ahmad Studio', 'Aniq Suhair', 'Berita Terkini', 'CIK AFIYA', 'Fadli Che', 'Hari ini Malaysia', 'Aisar Khaledd Fans', 'Bazookapenaka Media', 'Blog Mazeer', 'Clearwhitez Skinbooster HQ', 'Gempak Media', 'Kaki Viral Media'].map((page, idx) => (
              <label key={idx} style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" /> {page}
              </label>
            ))}
          </div>
        </div>

        {/* Kapsyen */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>Kapsyen:</label>
          <textarea 
            rows="4" 
            placeholder="Tulis kapsyen pos anda..." 
            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
          ></textarea>
        </div>

        {/* Upload Gambar / Video Utama */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>Upload Gambar / Video Utama (Pilihan):</label>
          <input type="file" style={{ marginBottom: '8px', display: 'block' }} />
          <input 
            type="text" 
            placeholder="Atau salin/tampal URL gambar/video di sini..." 
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
          />
        </div>

        {/* First Comment */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>First Comment (Komen Pertama):</label>
          <textarea 
            rows="3" 
            placeholder="Tulis komen pertama (pilihan)..." 
            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
          ></textarea>
        </div>

        {/* Upload Gambar untuk First Comment */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>Upload Gambar untuk First Comment (Pilihan):</label>
          <input type="file" style={{ marginBottom: '8px', display: 'block' }} />
          <input 
            type="text" 
            placeholder="Atau masukkan URL gambar komen..." 
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
          />
        </div>

        {/* Pilihan Mod Penghantaran */}
        <div style={{ display: 'flex', gap: '25px', marginBottom: '25px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
            <input type="radio" name="mode" defaultChecked /> Pos Sekarang
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
            <input type="radio" name="mode" /> Jadual Manual
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
            <input type="radio" name="mode" /> Auto-Queue Last ({currentProfile})
          </label>
        </div>

        {/* Butang Hantar */}
        <button style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: '14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(37,99,235,0.2)' }}>
          Hantar Sekarang
        </button>

      </div>
    </main>
  );
}
