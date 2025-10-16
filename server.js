// ============================
// SHIZA DASHBOARD SERVER
// ============================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());

const SECRET = process.env.SECRET || 'shiza_secret_key';
const USERS_FILE = './users.json';

// Pastikan file users.json ada
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));

// Fungsi bantu untuk baca/tulis user
function loadUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE));
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ============================
// REGISTER
// ============================
app.post('/api/register', async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'Lengkapi semua kolom!' });

  const users = loadUsers();
  if (users.find(u => u.email === email))
    return res.status(400).json({ error: 'Email sudah terdaftar!' });

  const hashed = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now(),
    name,
    email,
    password: hashed,
    phone: phone || ''
  };

  users.push(newUser);
  saveUsers(users);

  const token = jwt.sign(
    { id: newUser.id, name: newUser.name, email: newUser.email },
    SECRET,
    { expiresIn: '2h' }
  );

  res.json({ message: 'Registrasi sukses', token });
});

// ============================
// LOGIN
// ============================
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Email tidak ditemukan!' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Password salah!' });

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    SECRET,
    { expiresIn: '2h' }
  );
  res.json({ message: 'Login sukses', token });
});

// ============================
// MIDDLEWARE CEK TOKEN
// ============================
function verifyToken(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Token kosong' });
    const token = auth.split(' ')[1];
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
}

// ============================
// PROFILE
// ============================
app.get('/api/profile', verifyToken, (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan!' });

  res.json({
    username: user.name,
    email: user.email,
    phone: user.phone || ''
  });
});

// ============================
// PRODUK (ambil dari API publik dummyjson)
// ============================
app.get('/api/products', verifyToken, async (req, res) => {
  try {
    const response = await axios.get('https://fakestoreapi.com/products');
    res.json({ user: req.user, data: response.data });
  } catch (err) {
    console.error('Gagal ambil data produk:', err.message);
    res.status(500).json({ error: 'Gagal ambil data produk' });
  }
});

// ============================
// SERVER LISTEN
// ============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
