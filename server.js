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
