export default function Home() {
  return (
    <main style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#333', lineHeight: '1.6', margin: 0, padding: 0, background: '#f8f9fa', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      
      {/* Header / Navbar Korporat */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e3a8a', fontSize: '20px', fontWeight: '800', letterSpacing: '0.5px' }}>MAX BAGINDA TRADING</h2>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Enterprise Digital Solutions</span>
        </div>
        <nav style={{ display: 'flex', gap: '20px', fontSize: '14px', fontWeight: '600' }}>
          <a href="#about" style={{ color: '#4b5563', textDecoration: 'none' }}>Mengenai Kami</a>
          <a href="#services" style={{ color: '#4b5563', textDecoration: 'none' }}>Perkhidmatan</a>
          <a href="#contact" style={{ color: '#4b5563', textDecoration: 'none' }}>Hubungi</a>
        </nav>
      </header>

      {/* Hero Section dengan Gambar / Banner Korporat */}
      <section style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center' }}>
        <div>
          <span style={{ background: '#dbeafe', color: '#1e40af', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', marginBottom: '15px' }}>
            Portal Operasi Rasmi
          </span>
          <h1 style={{ fontSize: '36px', color: '#111827', margin: '0 0 15px 0', lineHeight: '1.2' }}>
            Penyelesaian Sistem Digital & Pengurusan Media Sosial
          </h1>
          <p style={{ color: '#4b5563', fontSize: '16px', marginBottom: '25px' }}>
            Max Baginda Trading komited menyediakan solusi perisian, automasi pemasaran, dan infrastruktur digital yang efisien untuk operasi perniagaan moden.
          </p>
          <div style={{ display: 'flex', gap: '15px' }}>
            <a href="/scheduler" style={{ background: '#2563eb', color: '#fff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)' }}>
              Buka Facebook Scheduler
            </a>
          </div>
        </div>
        
        {/* Bahagian Imej Korporat Berkualiti Tinggi */}
        <div style={{ background: '#ffffff', padding: '10px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
          <img 
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80" 
            alt="Corporate Dashboard" 
            style={{ width: '100%', height: 'auto', borderRadius: '8px', display: 'block' }} 
          />
          <div style={{ padding: '15px 10px 5px 10px' }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#1f2937', fontSize: '15px' }}>Automasi & Analisis Pintar</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Sistem teras yang direka khas untuk pengurusan penjadualan dan operasi digital bersepadu.</p>
          </div>
        </div>
      </section>

      {/* Bahagian Hubungi & Footer */}
      <section id="contact" style={{ background: '#ffffff', borderTop: '1px solid #e5e7eb', padding: '40px 20px', marginTop: '40px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div>
            <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>Hubungi Operasi Kami</h3>
            <p style={{ color: '#4b5563', fontSize: '14px', margin: '5px 0' }}><strong>Emel Rasmi:</strong> admin@maxbagindatrading.com</p>
            <p style={{ color: '#4b5563', fontSize: '14px', margin: '5px 0' }}><strong>Lokasi Operasi:</strong> Perak, Malaysia</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
            <a href="/privacy" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>→ Dasar Privasi (Privacy Policy)</a>
            <a href="/deletion" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>→ Arahan Pemadaman Data (Data Deletion)</a>
          </div>
        </div>
      </section>

      {/* Footer Bawah */}
      <footer style={{ background: '#111827', color: '#9ca3af', textAlign: 'center', padding: '20px', fontSize: '13px' }}>
        <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} Max Baginda Trading. Hak Cipta Terpelihara.</p>
      </footer>

    </main>
  );
}
