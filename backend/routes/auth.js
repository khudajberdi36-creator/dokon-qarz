const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../database');

const SECRET = process.env.JWT_SECRET || 'dokon_qarz_secret_2024';

// ─── OTP xotirasi ───────────────────────────────────────────────
const otpStore = new Map();

// ─── Eskiz SMS yuborish ──────────────────────────────────────────
async function sendSmsEskiz(phone, code) {
  const EMAIL = process.env.ESKIZ_EMAIL;
  const PASS  = process.env.ESKIZ_PASSWORD;

  if (!EMAIL || !PASS) {
    console.log(`[SMS-TEST] ${phone} → ${code}`);
    return { ok: true, test: true };
  }

  try {
    const tokenRes = await fetch('https://notify.eskiz.uz/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASS })
    });
    const tokenData = await tokenRes.json();
    const token = tokenData?.data?.token;
    if (!token) throw new Error('Token olinmadi');

    const cleanPhone = phone.replace(/\D/g, '');
    const smsRes = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        mobile_phone: cleanPhone,
        message: `Bu Eskiz dan test`,
        from: '4546'
      })
    });
    const smsData = await smsRes.json();
    console.log('SMS natija:', smsData);
    return { ok: true };
  } catch (err) {
    console.error('SMS xato:', err.message);
    return { ok: false, error: err.message };
  }
}

// ─── Brute-force himoya ──────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'nomalum';
    db.run_p(
      'INSERT INTO kirish_tarixi (username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4)',
      [req.body?.username || 'unknown', ip, req.headers['user-agent'] || '', 'bloklangan']
    ).catch(() => {});
    res.status(429).json({ error: "Juda ko'p urinish! 15 daqiqaga bloklandi." });
  }
});

const failedMap = new Map();
const MAX_FAIL = 5;
const BLOCK_MS = 30 * 60 * 1000;

function isBlocked(u) {
  const e = failedMap.get(u);
  if (!e) return false;
  if (Date.now() - e.t > BLOCK_MS) { failedMap.delete(u); return false; }
  return e.n >= MAX_FAIL;
}
function addFail(u) {
  const e = failedMap.get(u);
  if (!e || Date.now() - e.t > BLOCK_MS) failedMap.set(u, { n: 1, t: Date.now() });
  else e.n++;
}
function clearFail(u) { failedMap.delete(u); }

// ─── 1-QADAM: Login + Parol ──────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'nomalum';
  const ua = req.headers['user-agent'] || '';

  if (!username || !password)
    return res.status(400).json({ error: 'Username va parol kiritish shart' });

  if (isBlocked(username)) {
    await db.run_p(
      'INSERT INTO kirish_tarixi (username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4)',
      [username, ip, ua, 'bloklangan']
    ).catch(() => {});
    return res.status(429).json({ error: `"${username}" vaqtincha bloklandi. 30 daqiqadan keyin urinib ko'ring.` });
  }

  try {
    const user = await db.get_p('SELECT * FROM users WHERE username = $1', [username]);
    if (!user) {
      addFail(username);
      await db.run_p('INSERT INTO kirish_tarixi (username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4)',
        [username, ip, ua, 'muvaffaqiyatsiz']).catch(() => {});
      return res.status(400).json({ error: "Username yoki parol noto'g'ri" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      addFail(username);
      await db.run_p('INSERT INTO kirish_tarixi (user_id, username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4,$5)',
        [user.id, username, ip, ua, 'muvaffaqiyatsiz']).catch(() => {});
      const left = MAX_FAIL - (failedMap.get(username)?.n || 0);
      return res.status(400).json({
        error: left > 0
          ? `Parol noto'g'ri. Yana ${left} ta urinish qoldi.`
          : "Juda ko'p xato! Hisob vaqtincha bloklandi."
      });
    }

    // Parol to'g'ri — to'g'ridan kirish
    clearFail(username);
    await db.run_p('INSERT INTO kirish_tarixi (user_id, username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4,$5)',
      [user.id, username, ip, ua, 'muvaffaqiyatli']).catch(() => {});
    const token = jwt.sign(
      { id: user.id, username: user.username, dokon_nomi: user.dokon_nomi, full_name: user.full_name, role: user.role || 'user' },
      SECRET, { expiresIn: '7d' }
    );
    return res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, dokon_nomi: user.dokon_nomi, role: user.role || 'user' } });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── 2-QADAM: OTP tasdiqlash ─────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { username, code } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'nomalum';
  const ua = req.headers['user-agent'] || '';

  if (!username || !code)
    return res.status(400).json({ error: 'Username va kod kerak' });

  const otp = otpStore.get(username);
  if (!otp) return res.status(400).json({ error: 'Kod topilmadi. Qaytadan kirish tugmasini bosing.' });
  if (Date.now() > otp.expires) {
    otpStore.delete(username);
    return res.status(400).json({ error: 'Kod muddati tugadi. Qaytadan urinib ko\'ring.' });
  }
  if (otp.code !== code.trim())
    return res.status(400).json({ error: "Kod noto'g'ri" });

  otpStore.delete(username);
  clearFail(username);

  const user = await db.get_p('SELECT * FROM users WHERE id = $1', [otp.userId]);
  await db.run_p('INSERT INTO kirish_tarixi (user_id, username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4,$5)',
    [user.id, username, ip, ua, 'muvaffaqiyatli']).catch(() => {});

  const token = jwt.sign(
    { id: user.id, username: user.username, dokon_nomi: user.dokon_nomi, full_name: user.full_name, role: user.role || 'user' },
    SECRET, { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, dokon_nomi: user.dokon_nomi, role: user.role || 'user' } });
});

// ─── Parol reset ────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { secret, username, new_password } = req.body;
  const RESET_SECRET = process.env.RESET_SECRET || 'dokon_reset_2024';
  if (secret !== RESET_SECRET) return res.status(403).json({ error: "Ruxsat yo'q" });
  if (!username || !new_password) return res.status(400).json({ error: 'username va new_password kerak' });
  try {
    const user = await db.get_p('SELECT id FROM users WHERE username = $1', [username]);
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    const hash = await bcrypt.hash(new_password, 10);
    await db.run_p('UPDATE users SET password = $1 WHERE username = $2', [hash, username]);
    clearFail(username);
    res.json({ message: `✅ ${username} paroli yangilandi` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Parol o'zgartirish ─────────────────────────────────────────
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Me ─────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token kerak' });
  try {
    const user = jwt.verify(token, SECRET);
    res.json(user);
  } catch { res.status(401).json({ error: "Token noto'g'ri" }); }
});

module.exports = router;