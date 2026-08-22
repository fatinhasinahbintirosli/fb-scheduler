export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '40px', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
      <h1>MAX BAGINDA TRADING</h1>
      <p>Selamat datang ke portal rasmi Max Baginda Trading. Kami menyediakan perkhidmatan dan solusi digital berkualiti tinggi.</p>
      
      <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #ddd' }} />
      
      <h3>Akses Sistem</h3>
      <p>Jika anda adalah pengguna sah, anda boleh mengakses sistem pengurusan di pautan berikut:</p>
      <a href="/scheduler" style={{ display: 'inline-block', background: '#0070f3', color: '#fff', padding: '10px 20px', textDecoration: 'none', borderRadius: '5px' }}>
        Buka Facebook Scheduler
      </a>

      <div style={{ marginTop: '40px', fontSize: '14px', color: '#666' }}>
        <p>Hubungi Kami: ezhamdeli13@gmail.com</p>
        <p><a href="/privacy">Dasar Privasi (Privacy Policy)</a></p>
      </div>
    </main>
  );
}
