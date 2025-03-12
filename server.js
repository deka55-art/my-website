const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors'); // CORS hatalarını önlemek için

const app = express();
const port = process.env.PORT || 10000;  // Render için doğru port ayarı

// Middleware
app.use(express.json());
app.use(cors()); // CORS hatalarını engellemek için

// ✅ API'nin Çalıştığını Test Etmek İçin
app.get('/api/test', (req, res) => {
  res.json({ message: "API Çalışıyor!" });
});

// ✅ SQLite Veritabanı Bağlantısı
const db = new sqlite3.Database('./parcels.db', (err) => {
  if (err) {
    console.error('SQLite bağlantı hatası:', err.message);
  } else {
    console.log('SQLite veritabanına bağlandı.');
  }
});

// ✅ Parsel Kaydetme Endpoint’i
app.post('/api/parcels', (req, res) => {
  console.log("Gelen Veri:", req.body); // Gelen veriyi kontrol et
  const { parselNo, bitkiTuru, sulamaDurumu, projeSahibi, projeDurumu, projeBitisTarihi, arazıEğimi } = req.body;
  const query = `
    INSERT INTO parcels (parselNo, bitkiTuru, sulamaDurumu, projeSahibi, projeDurumu, projeBitisTarihi, arazıEğimi)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(query, [parselNo, bitkiTuru, sulamaDurumu, projeSahibi, projeDurumu, projeBitisTarihi, arazıEğimi], function(err) {
    if (err) {
      console.error("Veritabanına yazma hatası:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Parsel bilgisi kaydedildi!", id: this.lastID });
  });
});

// ✅ Parsel Verilerini Getirme Endpoint’i
app.get('/api/parcels', (req, res) => {
  db.all('SELECT * FROM parcels', (err, rows) => {
    if (err) {
      console.error("Veri çekme hatası:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log("API'den Dönen Veriler:", rows);
    res.json(rows);
  });
});

// ✅ Statik Dosyaları Sun (Bu en altta olmalı!)
app.use(express.static(path.join(__dirname, 'public')));

// Sunucuyu Başlat
app.listen(port, () => {
  console.log(`✅ Sunucu http://localhost:${port} adresinde çalışıyor...`);
});