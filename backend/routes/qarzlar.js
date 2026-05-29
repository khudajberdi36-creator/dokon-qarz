const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// ✅ TO'G'RI: /muddati-otgan /:id dan OLDIN turishi shart!
router.get('/muddati-otgan', auth, async (req, res) => {
  try {
    const rows = await db.all_p(`
      SELECT qz.*, qr.ism, qr.familiya, qr.telefon, qr.telegram, qr.whatsapp, qr.instagram,
        GREATEST(0,
          qz.summa - COALESCE((SELECT SUM(t.summa) FROM tolovlar t WHERE t.qarz_id = qz.id), 0)
        ) as qolgan_summa
      FROM qarzlar qz
      JOIN qarzdorlar qr ON qr.id = qz.qarzdor_id
      WHERE qz.user_id = $1
        AND qz.status = 'active'
        AND qz.muddat IS NOT NULL
        AND qz.muddat < CURRENT_DATE
      ORDER BY qz.muddat ASC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yangi qarz qo'shish
router.post('/', auth, async (req, res) => {
  try {
    const { qarzdor_id, summa, valyuta, sana, muddat, sabab } = req.body;
    if (!qarzdor_id || !summa || !sana)
      return res.status(400).json({ error: "Majburiy maydonlar to'ldirilmagan" });
    if (Number(summa) <= 0)
      return res.status(400).json({ error: "Summa 0 dan katta bo'lishi kerak" });

    // Qarzdor shu userga tegishli ekanini tekshirish
    const qarzdor = await db.get_p('SELECT id FROM qarzdorlar WHERE id = $1 AND user_id = $2', [qarzdor_id, req.user.id]);
    if (!qarzdor) return res.status(403).json({ error: "Ruxsat yo'q" });

    const result = await db.run_p(
      'INSERT INTO qarzlar (qarzdor_id, user_id, summa, valyuta, sana, muddat, sabab) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [qarzdor_id, req.user.id, summa, valyuta || 'UZS', sana, muddat || null, sabab]
    );
    res.json({ id: result.lastID, message: "Qarz qo'shildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// To'lov qo'shish
router.post('/:id/tolov', auth, async (req, res) => {
  try {
    const { summa, sana, izoh } = req.body;
    if (!summa || !sana)
      return res.status(400).json({ error: "Summa va sana kiritilishi shart" });
    if (Number(summa) <= 0)
      return res.status(400).json({ error: "To'lov summasi 0 dan katta bo'lishi kerak" });

    const qarz = await db.get_p('SELECT * FROM qarzlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!qarz) return res.status(404).json({ error: 'Qarz topilmadi' });

    await db.run_p(
      'INSERT INTO tolovlar (qarz_id, summa, sana, izoh) VALUES ($1,$2,$3,$4)',
      [req.params.id, summa, sana, izoh]
    );

    // ✅ Agar to'lovlar jami qarz summasiga yetsa, avtomatik yopish
    const tolovRow = await db.get_p('SELECT COALESCE(SUM(summa),0) as jami FROM tolovlar WHERE qarz_id = $1', [req.params.id]);
    if (Number(tolovRow.jami) >= Number(qarz.summa)) {
      await db.run_p("UPDATE qarzlar SET status = 'paid' WHERE id = $1", [req.params.id]);
    }

    res.json({ message: "To'lov qo'shildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qarzni yopish
router.put('/:id/close', auth, async (req, res) => {
  try {
    const qarz = await db.get_p('SELECT id FROM qarzlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!qarz) return res.status(404).json({ error: 'Qarz topilmadi' });

    await db.run_p("UPDATE qarzlar SET status = 'paid' WHERE id = $1", [req.params.id]);
    res.json({ message: "Qarz yopildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bitta qarzni olish
router.get('/:id', auth, async (req, res) => {
  try {
    const qarz = await db.get_p(`
      SELECT qz.*,
        GREATEST(0,
          qz.summa - COALESCE((SELECT SUM(t.summa) FROM tolovlar t WHERE t.qarz_id = qz.id), 0)
        ) as qolgan_summa,
        (SELECT json_agg(t ORDER BY t.sana DESC) FROM tolovlar t WHERE t.qarz_id = qz.id) as tolovlar
      FROM qarzlar qz
      WHERE qz.id = $1 AND qz.user_id = $2
    `, [req.params.id, req.user.id]);

    if (!qarz) return res.status(404).json({ error: 'Qarz topilmadi' });
    res.json(qarz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qarzni o'chirish
router.delete('/:id', auth, async (req, res) => {
  try {
    const qarz = await db.get_p('SELECT id FROM qarzlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!qarz) return res.status(404).json({ error: 'Qarz topilmadi' });

    await db.run_p('DELETE FROM qarzlar WHERE id = $1', [req.params.id]);
    res.json({ message: "O'chirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
