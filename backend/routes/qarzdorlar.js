const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Barcha qarzdorlar
router.get('/', auth, async (req, res) => {
  try {
    const rows = await db.all_p(`
      SELECT q.*,
        GREATEST(0,
          COALESCE((
            SELECT SUM(qz_a.summa)
            FROM qarzlar qz_a
            WHERE qz_a.qarzdor_id = q.id AND qz_a.user_id = $1 AND qz_a.status = 'active'
          ), 0) -
          COALESCE((
            SELECT SUM(t.summa)
            FROM tolovlar t
            JOIN qarzlar qz_b ON t.qarz_id = qz_b.id
            WHERE qz_b.qarzdor_id = q.id AND qz_b.user_id = $2
          ), 0)
        ) AS jami_qarz,
        (
          SELECT COUNT(*)
          FROM qarzlar qz_c
          WHERE qz_c.qarzdor_id = q.id AND qz_c.user_id = $3 AND qz_c.status = 'active'
        ) as qarz_soni
      FROM qarzdorlar q
      WHERE q.user_id = $4
      ORDER BY jami_qarz DESC
    `, [req.user.id, req.user.id, req.user.id, req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qidiruv — ✅ TUZATILDI: qarz_soni ham qaytariladi
router.get('/search', auth, async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const rows = await db.all_p(`
      SELECT q.*,
        GREATEST(0,
          COALESCE((SELECT SUM(qz.summa) FROM qarzlar qz WHERE qz.qarzdor_id = q.id AND qz.user_id = $1 AND qz.status = 'active'), 0) -
          COALESCE((SELECT SUM(t.summa) FROM tolovlar t JOIN qarzlar qz ON t.qarz_id = qz.id WHERE qz.qarzdor_id = q.id AND qz.user_id = $2), 0)
        ) AS jami_qarz,
        (SELECT COUNT(*) FROM qarzlar qz WHERE qz.qarzdor_id = q.id AND qz.user_id = $3 AND qz.status = 'active') as qarz_soni
      FROM qarzdorlar q
      WHERE q.user_id = $4
        AND (q.ism ILIKE $5 OR q.familiya ILIKE $5 OR q.telefon ILIKE $5)
      ORDER BY q.ism
    `, [req.user.id, req.user.id, req.user.id, req.user.id, q]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bitta qarzdor (qarzlar bilan)
router.get('/:id', auth, async (req, res) => {
  try {
    const qarzdor = await db.get_p(
      'SELECT * FROM qarzdorlar WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!qarzdor) return res.status(404).json({ error: 'Topilmadi' });

    const qarzlar = await db.all_p(`
      SELECT qz.*,
        GREATEST(0,
          qz.summa - COALESCE((SELECT SUM(t.summa) FROM tolovlar t WHERE t.qarz_id = qz.id), 0)
        ) as qolgan_summa,
        (SELECT json_agg(t ORDER BY t.sana DESC) FROM tolovlar t WHERE t.qarz_id = qz.id) as tolovlar,
        m.nomi as mahsulot_nomi,
        m.birlik as mahsulot_birlik,
        COALESCE(m.emoji, '📦') as mahsulot_emoji
      FROM qarzlar qz
      LEFT JOIN mahsulotlar m ON m.id = qz.mahsulot_id
      WHERE qz.qarzdor_id = $1 AND qz.user_id = $2
      ORDER BY qz.created_at DESC
    `, [req.params.id, req.user.id]);

    res.json({ ...qarzdor, qarzlar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yangi qarzdor qo'shish
router.post('/', auth, async (req, res) => {
  try {
    const { ism, familiya, telefon, telegram, instagram, whatsapp, manzil, izoh } = req.body;
    if (!ism || !telefon)
      return res.status(400).json({ error: "Ism va telefon majburiy" });

    // ✅ TUZATILDI: Telefon takrorlanmasligini tekshirish
    const exists = await db.get_p(
      'SELECT id FROM qarzdorlar WHERE telefon = $1 AND user_id = $2',
      [telefon, req.user.id]
    );
    if (exists) return res.status(400).json({ error: "Bu telefon raqam allaqachon mavjud" });

    const result = await db.run_p(
      'INSERT INTO qarzdorlar (user_id, ism, familiya, telefon, telegram, instagram, whatsapp, manzil, izoh) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [req.user.id, ism, familiya, telefon, telegram || null, instagram || null, whatsapp || null, manzil || null, izoh || null]
    );
    res.json({ id: result.lastID, message: "Saqlandi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qarzdorni yangilash
router.put('/:id', auth, async (req, res) => {
  try {
    const { ism, familiya, telefon, telegram, instagram, whatsapp, manzil, izoh } = req.body;
    if (!ism || !telefon)
      return res.status(400).json({ error: "Ism va telefon majburiy" });

    const qarzdor = await db.get_p('SELECT id FROM qarzdorlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!qarzdor) return res.status(404).json({ error: 'Topilmadi' });

    await db.run_p(
      'UPDATE qarzdorlar SET ism=$1, familiya=$2, telefon=$3, telegram=$4, instagram=$5, whatsapp=$6, manzil=$7, izoh=$8, eslatma=$9 WHERE id=$10 AND user_id=$11',
      [ism, familiya, telefon, telegram || null, instagram || null, whatsapp || null, manzil || null, izoh || null, req.body.eslatma || null, req.params.id, req.user.id]
    );
    res.json({ message: "Yangilandi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qarzdorni o'chirish
router.delete('/:id', auth, async (req, res) => {
  try {
    const qarzdor = await db.get_p('SELECT id FROM qarzdorlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!qarzdor) return res.status(404).json({ error: 'Topilmadi' });

    await db.run_p('DELETE FROM qarzdorlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: "O'chirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;