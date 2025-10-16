require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SECRET = process.env.JWT_SECRET || 'RahasiaKuatBanget123';

// Simulasi database sementara (nanti bisa ganti ke MySQL)
let users = [];

// REGISTER
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email sudah terdaftar' });
  }
  const hash = await bcrypt.hash(password, 10);
  const newUser = { id: users.length + 1, name, email, password: hash };
  users.push(newUser);
  res.json({ message: 'Registrasi berhasil!' });
});

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Email tidak ditemukan' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Password salah' });

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, SECRET, { expiresIn: '2h' });
  res.json({ message: 'Login sukses', token });
});

// Middleware cek token
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Token kosong' });
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
}

// Protected route (API produk)
app.get('/api/products', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(process.env.REMOTE_API_URL);
    res.json({ user: req.user, data: response.data });
  } catch (err) {
    console.error('Gagal ambil data API:', err.message);
    res.status(500).json({ error: 'Gagal ambil data produk' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
