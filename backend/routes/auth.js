const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const SECRET = process.env.JWT_SECRET || 'dokon_qarz_secret_2024';

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'nomalum';
  const user_agent = req.headers['user-agent'] || '';

  if (!username || !password)
    return res.status(400).json({ error: "Username va parol kiritish shart" });

  try {
    const user = await db.get_p('SELECT * FROM users WHERE username = $1', [username]);
    if (!user) {
      await db.run_p('INSERT INTO kirish_tarixi (username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4)',
        [username, ip, user_agent, 'muvaffaqiyatsiz']).catch(() => {});
      return res.status(400).json({ error: "Username yoki parol noto'g'ri" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await db.run_p('INSERT INTO kirish_tarixi (user_id, username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4,$5)',
        [user.id, username, ip, user_agent, 'muvaffaqiyatsiz']).catch(() => {});
      return res.status(400).json({ error: "Username yoki parol noto'g'ri" });
    }

    // Muvaffaqiyatli kirish tarixi
    await db.run_p('INSERT INTO kirish_tarixi (user_id, username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4,$5)',
      [user.id, username, ip, user_agent, 'muvaffaqiyatli']).catch(() => {});

    const token = jwt.sign(
      { id: user.id, username: user.username, dokon_nomi: user.dokon_nomi, full_name: user.full_name, role: user.role || 'user' },
      SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, full_name: user.full_name, dokon_nomi: user.dokon_nomi, role: user.role || 'user' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Parol reset
router.post('/reset-password', async (req, res) => {
  const { secret, username, new_password } = req.body;
  const RESET_SECRET = process.env.RESET_SECRET || 'dokon_reset_2024';
  if (secret !== RESET_SECRET) return res.status(403).json({ error: "Ruxsat yo'q" });
  if (!username || !new_password) return res.status(400).json({ error: "username va new_password kerak" });
  try {
    const user = await db.get_p('SELECT id FROM users WHERE username = $1', [username]);
    if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    const hash = await bcrypt.hash(new_password, 10);
    await db.run_p('UPDATE users SET password = $1 WHERE username = $2', [hash, username]);
    res.json({ message: `✅ ${username} paroli muvaffaqiyatli yangilandi` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Parol o'zgartirish
router.post('/change-password', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token kerak' });
  try {
    const decoded = jwt.verify(token, SECRET);
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) return res.status(400).json({ error: 'Parollar kiritilmadi' });
    if (new_password.length < 6) return res.status(400).json({ error: "Yangi parol kamida 6 ta belgi bo'lsin" });
    const user = await db.get_p('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Eski parol noto'g'ri" });
    const newHash = await bcrypt.hash(new_password, 10);
    await db.run_p('UPDATE users SET password = $1 WHERE id = $2', [newHash, decoded.id]);
    res.json({ message: "Parol muvaffaqiyatli o'zgartirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token kerak' });
  try {
    const user = jwt.verify(token, SECRET);
    res.json(user);
  } catch {
    res.status(401).json({ error: "Token noto'g'ri" });
  }
});

module.exports = router;