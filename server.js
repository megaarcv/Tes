// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const users = []; // sementara array, nanti ganti DB sungguhan

const SECRET = process.env.JWT_SECRET || 'supersecret';

// REGISTER
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email sudah terdaftar' });
  }
  const hash = await bcrypt.hash(password, 10);
  const newUser = { id: users.length + 1, name, email, password_hash: hash };
  users.push(newUser);
  res.json({ message: 'Registrasi berhasil' });
});

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Email tidak ditemukan' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Password salah' });

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// Middleware auth
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid' });
  }
}

// Contoh endpoint protected
app.get('/api/profile', auth, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  res.json({ user });
});
app.use(express.static(path.join(__dirname, 'public')));

// limiter sederhana
const limiter = rateLimit({ windowMs: 60*1000, max: 120 });
app.use('/api/', limiter);

// in-memory cache (demo). Pakai Redis di production.
let cache = { products: null, ts: 0 };
const TTL = 1000 * 60 * 2; // 2 menit

app.get('/api/products', async (req, res) => {
  try {
    const now = Date.now();
    if (cache.products && (now - cache.ts) < TTL) {
      return res.json({ source: 'cache', data: cache.products });
    }

    // GANTI ini ke URL API partner yang diberikan nanti
    const REMOTE = process.env.REMOTE_API_URL;
    const TOKEN = process.env.API_TOKEN;

    if (!REMOTE || !TOKEN) {
      return res.status(500).json({ error: 'REMOTE_API_URL or API_TOKEN not configured' });
    }

    const r = await axios.get(REMOTE, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      timeout: 10000
    });

    // Jika struktur respon beda, transform sesuai kebutuhan
    const products = Array.isArray(r.data) ? r.data : (r.data.data || []);
    // contoh transform minimal (sesuaikan dengan schema)
    const mapped = products.map(p => ({
      id: p.id || p.product_id || '',
      title: p.name || p.title || 'No title',
      price: p.price || p.harga || 0,
      stock: p.stock || p.qty || 0,
      image: p.image || p.image_url || null,
      sold: p.sold || 0
    }));

    cache = { products: mapped, ts: Date.now() };
    res.json({ source: 'remote', data: mapped });
  } catch (err) {
    console.error('ERR /api/products', err.message || err);
    if (cache.products) return res.json({ source: 'cache', data: cache.products });
    res.status(502).json({ error: 'gagal ambil data' });
  }
});

// fallback to index for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
