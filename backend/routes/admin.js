const express = require('express');
const router = express.Router();
const db = require('../database');
const adminAuth = require('../middleware/adminAuth');

// ✅ TUZATILDI: Foydalanuvchilar DB dan olinadi (hardcoded emas)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const users = await db.all_p(
      'SELECT id, username, full_name, dokon_nomi, role FROM users ORDER BY id'
    );

    const result = [];
    for (const u of users) {
      const r1 = await db.get_p('SELECT COUNT(*) as c FROM qarzdorlar WHERE user_id = $1', [u.id]);
      const r2 = await db.get_p("SELECT COALESCE(SUM(summa),0) as total FROM qarzlar WHERE user_id = $1 AND status='active'", [u.id]);
      const r3 = await db.get_p(`
        SELECT COALESCE(SUM(t.summa),0) as total
        FROM tolovlar t JOIN qarzlar q ON t.qarz_id=q.id
        WHERE q.user_id=$1
      `, [u.id]);
      const jami_qarz = Number(r2.total);
      const tolov_qilingan = Number(r3.total);
      result.push({
        ...u,
        jami_qarzdorlar: Number(r1.c),
        jami_qarz,
        tolov_qilingan,
        qolgan_qarz: Math.max(0, jami_qarz - tolov_qilingan)
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Barcha qarzdorlar (hamma foydalanuvchilarniki)
router.get('/qarzdorlar', adminAuth, async (req, res) => {
  try {
    const rows = await db.all_p(`
      SELECT q.*, u.username, u.dokon_nomi,
        GREATEST(0,
          COALESCE((SELECT SUM(qz.summa) FROM qarzlar qz WHERE qz.qarzdor_id=q.id AND qz.status='active'),0) -
          COALESCE((SELECT SUM(t.summa) FROM tolovlar t JOIN qarzlar qz ON t.qarz_id=qz.id WHERE qz.qarzdor_id=q.id),0)
        ) AS jami_qarz
      FROM qarzdorlar q
      JOIN users u ON u.id = q.user_id
      ORDER BY jami_qarz DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Foydalanuvchilar ro'yxati
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await db.all_p('SELECT id, username, full_name, dokon_nomi, role, created_at FROM users ORDER BY id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Biror foydalanuvchining barcha ma'lumotlarini o'chirish
router.delete('/user/:userId/data', adminAuth, async (req, res) => {
  try {
    await db.run_p('DELETE FROM qarzdorlar WHERE user_id = $1', [req.params.userId]);
    res.json({ message: "O'chirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
