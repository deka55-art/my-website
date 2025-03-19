require('dotenv').config(); // .env dosyasını yükler
const express = require('express');
const path = require('path');
const { Client } = require('pg'); // PostgreSQL bağlantısı için
const cors = require('cors');
const session = require('express-session'); // Oturum yönetimi için
const pgSession = require('connect-pg-simple')(session); // PostgreSQL tabanlı session store
const bcrypt = require('bcryptjs'); // Şifre hash'leme için
const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL bağlantısı
const client = new Client({
  connectionString: process.env.DATABASE_URL, // Render'daki PostgreSQL URL
  ssl: {
    rejectUnauthorized: false // Render için SSL doğrulaması kapatıldı
  }
});

// Veritabanına bağlan
client.connect()
  .then(() => {
    console.log('✅ PostgreSQL bağlantısı başarılı.');

    // Gerekli tabloları oluştur
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
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
      );

      CREATE TABLE IF NOT EXISTS session (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      );
    `);
  })
  .then(() => {
    console.log('✅ Tablolar oluşturuldu veya zaten var.');
    return createInitialUsers(); // Kullanıcı hesaplarını oluştur
  })
  .catch(err => {
    console.error('❌ PostgreSQL bağlantı veya tablo oluşturma hatası:', err);
    process.exit(1);
  });

// Middleware: JSON verilerini işlemek için
app.use(express.json());
app.use(cors());

// **PostgreSQL tabanlı oturum yönetimi**
app.use(session({
  store: new pgSession({
    pool: client, // PostgreSQL bağlantısını kullan
    tableName: 'session', // Oturumları saklamak için tablo
  }),
  secret: process.env.SESSION_SECRET || 'gizli_anahtar', // .env içine koyulmalı
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS varsa true yap
    maxAge: 1000 * 60 * 60 * 24, // Oturum süresi: 1 gün
    httpOnly: true
  }
}));

// Statik dosyaları sun (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Kullanıcı girişi
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.password);
      if (validPassword) {
        req.session.user = { id: user.id, username: user.username, role: user.role }; // Oturum başlat
        res.json({ role: user.role });
      } else {
        res.status(401).json({ error: 'Geçersiz şifre' });
      }
    } else {
      res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
  } catch (err) {
    console.error('❌ Giriş yapılırken hata:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Parsel verilerini getir
app.get('/api/parcels', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM parcels');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Parsel verileri getirilirken hata:', err);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

// Yeni parsel ekle (Sadece admin)
app.post('/api/parcels', async (req, res) => {
  if (req.session.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  const { parsel_no, koordinatlar, bitki, sulama, proje_sahibi, projedurumu, proje_tarihi, Arazi_Egimi } = req.body;

  try {
    const result = await client.query(
      'INSERT INTO parcels (parsel_no, koordinatlar, bitki, sulama, proje_sahibi, projedurumu, proje_tarihi, Arazi_Egimi) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [parsel_no, koordinatlar, bitki, sulama, proje_sahibi, projedurumu, proje_tarihi, Arazi_Egimi]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Parsel eklenirken hata:', err);
    res.status(400).json({ error: 'Veritabanı hatası' });
  }
});

// Kullanıcı hesaplarını oluştur
const createInitialUsers = async () => {
  try {
    const adminPassword = await bcrypt.hash('tbae321', 10);
    await client.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
      ['admin', adminPassword, 'admin']
    );

    const userPassword = await bcrypt.hash('tbae123', 10);
    await client.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
      ['users', userPassword, 'user']
    );

    console.log('✅ Admin ve user hesapları oluşturuldu veya zaten var.');
  } catch (err) {
    console.error('❌ Kullanıcı hesapları oluşturulurken hata:', err);
  }
};

// Sunucuyu başlat
app.listen(port, () => {
  console.log(`🚀 Sunucu http://localhost:${port} adresinde çalışıyor...`);
});

// Uygulama kapanırken PostgreSQL bağlantısını kapat
process.on('SIGINT', () => {
  client.end()
    .then(() => {
      console.log('📴 PostgreSQL bağlantısı kapatıldı.');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ PostgreSQL bağlantısı kapatılırken hata:', err);
      process.exit(1);
    });
});
