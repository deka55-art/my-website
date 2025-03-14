const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// SQLite veritabanı bağlantısı
const db = new sqlite3.Database('./parcels.db');

// Tablo oluştur (eğer yoksa)
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS parcels (id INTEGER PRIMARY KEY AUTOINCREMENT, parsel_no TEXT, koordinatlar TEXT, bitki TEXT, sulama TEXT, proje_sahibi TEXT, projedurumu TEXT, proje_tarihi TEXT, Arazi_Egimi TEXT)");
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
app.get('/api/parcels', (req, res) => {
    db.all("SELECT * FROM parcels", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Yeni parsel ekle
app.post('/api/parcels', (req, res) => {
    const { parsel_no, koordinatlar, bitki, sulama, proje_sahibi, projedurumu, proje_tarihi, Arazi_Egimi } = req.body;
    const sql = "INSERT INTO parcels (parsel_no, koordinatlar, bitki, sulama, proje_sahibi, projedurumu, proje_tarihi, Arazi_Egimi) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    db.run(sql, [parsel_no, JSON.stringify(koordinatlar), bitki, sulama, proje_sahibi, projedurumu, proje_tarihi, Arazi_Egimi], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(201).json({ id: this.lastID });
    });
});

// Parsel sil
app.delete('/api/parcels/:id', (req, res) => {
  const id = req.params.id;
  console.log("Silinecek parsel ID'si:", id); // Silinecek ID'yi konsola yaz

  db.run("DELETE FROM parcels WHERE id = ?", id, function(err) {
      if (err) {
          console.error("Veritabanı hatası:", err.message); // Hata mesajını konsola yaz
          res.status(400).json({ error: err.message });
          return;
      }
      console.log("Parsel veritabanından silindi:", id); // Başarılı silme işlemini konsola yaz
      res.status(204).send(); // Başarılı yanıt (No Content)
  });
});

// Sunucuyu başlat
app.listen(port, () => {
  console.log(`Sunucu http://localhost:${port} adresinde çalışıyor...`);
});