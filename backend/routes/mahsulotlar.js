const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Barcha kategoriyalar
router.get('/kategoriyalar', auth, async (req, res) => {
  try {
    const rows = await db.all_p(
      'SELECT k.*, COUNT(m.id) as mahsulot_soni, COALESCE(SUM(m.narx * m.miqdor), 0) as umumiy_qiymat FROM kategoriyalar k LEFT JOIN mahsulotlar m ON m.kategoriya_id = k.id AND m.user_id = $1 WHERE k.user_id = $1 GROUP BY k.id ORDER BY k.nomi',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kategoriya qo'shish
router.post('/kategoriyalar', auth, async (req, res) => {
  const { nomi, rang, emoji } = req.body;
  if (!nomi) return res.status(400).json({ error: 'Kategoriya nomi kerak' });
  try {
    const row = await db.run_p(
      'INSERT INTO kategoriyalar (user_id, nomi, rang, emoji) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, nomi, rang || '#6366f1', emoji || '📦']
    );
    res.json(row.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kategoriya o'chirish
router.delete('/kategoriyalar/:id', auth, async (req, res) => {
  try {
    await db.run_p('DELETE FROM kategoriyalar WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: "O'chirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Barcha mahsulotlar
router.get('/', auth, async (req, res) => {
  const { kategoriya_id, search } = req.query;
  try {
    let query = `
      SELECT m.*, k.nomi as kategoriya_nomi, k.emoji, k.rang,
        (m.narx * m.miqdor) as umumiy_qiymat
      FROM mahsulotlar m
      LEFT JOIN kategoriyalar k ON k.id = m.kategoriya_id
      WHERE m.user_id = $1
    `;
    const params = [req.user.id];
    if (kategoriya_id) { params.push(kategoriya_id); query += ` AND m.kategoriya_id = $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND m.nomi ILIKE $${params.length}`; }
    query += ' ORDER BY m.nomi';
    const rows = await db.all_p(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mahsulot qo'shish
router.post('/', auth, async (req, res) => {
  const { nomi, kategoriya_id, narx, miqdor, birlik, izoh } = req.body;
  if (!nomi || !narx) return res.status(400).json({ error: 'Nomi va narx kerak' });
  try {
    const row = await db.run_p(
      'INSERT INTO mahsulotlar (user_id, kategoriya_id, nomi, narx, miqdor, birlik, izoh) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.user.id, kategoriya_id || null, nomi, narx, miqdor || 0, birlik || 'dona', izoh || '']
    );
    res.json(row.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mahsulot tahrirlash
router.put('/:id', auth, async (req, res) => {
  const { nomi, kategoriya_id, narx, miqdor, birlik, izoh } = req.body;
  try {
    const row = await db.run_p(
      'UPDATE mahsulotlar SET nomi=$1, kategoriya_id=$2, narx=$3, miqdor=$4, birlik=$5, izoh=$6 WHERE id=$7 AND user_id=$8 RETURNING *',
      [nomi, kategoriya_id || null, narx, miqdor || 0, birlik || 'dona', izoh || '', req.params.id, req.user.id]
    );
    res.json(row.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mahsulot o'chirish
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.run_p('DELETE FROM mahsulotlar WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: "O'chirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventar statistikasi
router.get('/stats', auth, async (req, res) => {
  try {
    const umumiy = await db.get_p(
      'SELECT COUNT(*) as jami_mahsulot, COALESCE(SUM(narx * miqdor), 0) as umumiy_qiymat, COALESCE(SUM(miqdor), 0) as jami_miqdor FROM mahsulotlar WHERE user_id=$1',
      [req.user.id]
    );
    const kategoriyalar = await db.all_p(
      `SELECT k.nomi, k.emoji, k.rang, COUNT(m.id) as mahsulot_soni, COALESCE(SUM(m.narx * m.miqdor), 0) as qiymat
       FROM kategoriyalar k LEFT JOIN mahsulotlar m ON m.kategoriya_id=k.id AND m.user_id=$1
       WHERE k.user_id=$1 GROUP BY k.id, k.nomi, k.emoji, k.rang ORDER BY qiymat DESC`,
      [req.user.id]
    );
    res.json({ ...umumiy, kategoriyalar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;