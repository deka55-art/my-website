require('dotenv').config(); // .env dosyasını yükler
const express = require('express');
const path = require('path');
const { Client } = require('pg'); // PostgreSQL için
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL bağlantısı
const client = new Client({
  connectionString: process.env.bae_parsel, // Render'da otomatik olarak sağlanır
  ssl: {
    rejectUnauthorized: false // SSL sertifikasını doğrulama (Render için gerekli)
  }
});

// Veritabanına bağlan
client.connect()
  .then(() => {
    console.log('PostgreSQL veritabanına bağlanıldı.');

    // Tablo oluştur (eğer yoksa)
    return client.query(`
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
    `);
  })
  .then(() => {
    console.log('Tablo oluşturuldu veya zaten var.');
  })
  .catch(err => {
    console.error('PostgreSQL bağlantı veya tablo oluşturma hatası:', err);
    process.exit(1); // Hata durumunda uygulamayı sonlandır
  });

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
    console.error('Parsel verileri getirilirken hata:', err);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

// Yeni parsel ekle
app.post('/api/parcels', async (req, res) => {
  const { parsel_no, koordinatlar, bitki, sulama, proje_sahibi, projedurumu, proje_tarihi, Arazi_Egimi } = req.body;

  // Koordinatların JSON formatında olduğundan emin ol
  let parsedKoordinatlar;
  try {
    parsedKoordinatlar = JSON.stringify(koordinatlar);
  } catch (err) {
    console.error('Koordinatlar JSON formatına dönüştürülürken hata:', err);
    return res.status(400).json({ error: 'Geçersiz koordinatlar formatı' });
  }

  try {
    const result = await client.query(
      'INSERT INTO parcels (parsel_no, koordinatlar, bitki, sulama, proje_sahibi, projedurumu, proje_tarihi, Arazi_Egimi) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [parsel_no, parsedKoordinatlar, bitki, sulama, proje_sahibi, projedurumu, proje_tarihi, Arazi_Egimi]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Parsel eklenirken hata:', err);
    res.status(400).json({ error: 'Veritabanı hatası' });
  }
});

// Parsel sil
app.delete('/api/parcels/:id', async (req, res) => {
  const id = req.params.id;

  try {
    await client.query('DELETE FROM parcels WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Parsel silinirken hata:', err);
    res.status(400).json({ error: 'Veritabanı hatası' });
  }
});

// Sunucuyu başlat
app.listen(port, () => {
  console.log(`Sunucu http://localhost:${port} adresinde çalışıyor...`);
});

// Uygulama sonlandırıldığında PostgreSQL bağlantısını kapat
process.on('SIGINT', () => {
  client.end()
    .then(() => {
      console.log('PostgreSQL bağlantısı kapatıldı.');
      process.exit(0);
    })
    .catch(err => {
      console.error('PostgreSQL bağlantısı kapatılırken hata:', err);
      process.exit(1);
    });
});