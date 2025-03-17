const express = require('express');
const path = require('path');
const { Client } = require('pg'); // PostgreSQL için
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL bağlantısı
const client = new Client({
  connectionString: process.env.DATABASE_URL, // Render'da otomatik olarak sağlanır
  ssl: {
    rejectUnauthorized: false // SSL sertifikasını doğrulama (Render için gerekli)
  }
});

// Veritabanına bağlan
client.connect()
  .then(() => console.log('PostgreSQL veritabanına bağlanıldı.'))
  .catch(err => console.error('PostgreSQL bağlantı hatası:', err));

// Tablo oluştur (eğer yoksa)
client.query(`
  CREATE TABLE IF NOT EXISTS parcels (
    id SERIAL PRIMARY KEY,
    parsel_no TEXT,
    koordinatlar TEXT,
    bitki TEXT,
    sulama TEXT,
    proje_sahibi TEXT,
    projedurumu TEXT,
    proje_tarihi TEXT,
    Arazi_Egimi TEXT
  )
`).then(() => console.log('Tablo oluşturuldu veya zaten var.'))
  .catch(err => console.error('Tablo oluşturma hatası:', err));

// Middleware: JSON verilerini işlemek için
app.use(express.json());
app.use(cors());

// Statik dosyaları sun (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Ana route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Parsel verilerini getir
app.get('/api/parcels', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM parcels');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni parsel ekle
app.post('/api/parcels', async (req, res) => {
  const { parsel_no, koordinatlar, bitki, sulama, proje_sahibi, projedurumu, proje_tarihi, Arazi_Egimi } = req.body;
  try {
    const result = await client.query(
      'INSERT INTO parcels (parsel_no, koordinatlar, bitki, sulama, proje_sahibi, projedurumu, proje_tarihi, Arazi_Egimi) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [parsel_no, JSON.stringify(koordinatlar), bitki, sulama, proje_sahibi, projedurumu, proje_tarihi, Arazi_Egimi]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Parsel sil
app.delete('/api/parcels/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await client.query('DELETE FROM parcels WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Sunucuyu başlat
app.listen(port, () => {
  console.log(`Sunucu http://localhost:${port} adresinde çalışıyor...`);
});