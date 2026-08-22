export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '40px', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6', color: '#333' }}>
      <header style={{ borderBottom: '2px solid #eaeaea', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#111' }}>MAX BAGINDA TRADING</h1>
        <p style={{ margin: 0, color: '#666' }}>Penyelesaian Sistem Digital & Pengurusan Media Sosial</p>
      </header>

      <section style={{ marginBottom: '30px' }}>
        <h2>Mengenai Kami</h2>
        <p>Max Baginda Trading adalah sebuah entiti perniagaan yang komited menyediakan solusi perisian, automasi pemasaran, dan perkhidmatan digital yang efisien untuk kegunaan operasi moden.</p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>Akses Sistem Dalam Talian</h2>
        <p>Jika anda adalah pentadbir atau pengguna sah yang berdaftar, anda boleh mengakses portal pengurusan melalui pautan di bawah:</p>
        <a href="/scheduler" style={{ display: 'inline-block', background: '#0070f3', color: '#fff', padding: '12px 24px', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
          Buka Facebook Scheduler
        </a>
      </section>

      <section style={{ marginBottom: '30px', background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
        <h3>Hubungi Kami</h3>
        <p style={{ margin: '5px 0' }}><strong>Emel Rasmi:</strong> ezhamdeli13@gmail.com</p>
        <p style={{ margin: '5px 0' }}><strong>Alamat Operasi:</strong> Perak, Malaysia</p>
      </section>

      <footer style={{ borderTop: '1px solid #eaeaea', paddingTop: '20px', fontSize: '14px', color: '#666', display: 'flex', gap: '20px' }}>
        <a href="/privacy" style={{ color: '#0070f3', textDecoration: 'none' }}>Dasar Privasi (Privacy Policy)</a>
        <span>|</span>
        <a href="/deletion" style={{ color: '#0070f3', textDecoration: 'none' }}>Arahan Pemadaman Data (Data Deletion)</a>
      </footer>
    </main>
  );
}
