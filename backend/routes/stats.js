const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Asosiy statistika
router.get('/', auth, async (req, res) => {
  try {
    const r1 = await db.get_p('SELECT COUNT(*) as c FROM qarzdorlar WHERE user_id = $1', [req.user.id]);
    const r2 = await db.get_p("SELECT COALESCE(SUM(summa), 0) as total FROM qarzlar WHERE user_id = $1 AND status = 'active'", [req.user.id]);
    const r3 = await db.get_p(`
      SELECT COALESCE(SUM(t.summa), 0) as total
      FROM tolovlar t
      JOIN qarzlar q ON t.qarz_id = q.id
      WHERE q.user_id = $1
    `, [req.user.id]);
    const r4 = await db.get_p(`
      SELECT COUNT(*) as c FROM qarzlar
      WHERE user_id = $1 AND status = 'active'
        AND muddat IS NOT NULL AND muddat < CURRENT_DATE
    `, [req.user.id]);
    const r5 = await db.get_p(`
      SELECT COUNT(*) as c FROM qarzlar
      WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
    `, [req.user.id]);

    // ✅ YANGI: Bugungi harakatlar
    const bugun_tolov = await db.get_p(`
      SELECT COUNT(*) as c FROM tolovlar t
      JOIN qarzlar q ON t.qarz_id = q.id
      WHERE q.user_id = $1 AND DATE(t.created_at) = CURRENT_DATE
    `, [req.user.id]);
    const bugun_qarzdor = await db.get_p(`
      SELECT COUNT(*) as c FROM qarzdorlar
      WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
    `, [req.user.id]);

    const jami_qarz = Number(r2.total);
    const tolov_qilingan = Number(r3.total);

    // ✅ YANGI: To'lov foizi
    const tolov_foizi = jami_qarz > 0
      ? Math.round((tolov_qilingan / (jami_qarz + tolov_qilingan)) * 100)
      : 0;

    res.json({
      jami_qarzdorlar: Number(r1.c),
      jami_qarz,
      tolov_qilingan,
      qolgan_qarz: Math.max(0, jami_qarz - tolov_qilingan),
      muddati_otgan: Number(r4.c),
      yangi_qarzlar: Number(r5.c),
      // ✅ YANGI maydonlar
      bugun_tolovlar: Number(bugun_tolov.c),
      bugun_qarzdorlar: Number(bugun_qarzdor.c),
      tolov_foizi
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Oylik statistika (grafik uchun) - oxirgi 6 oy
router.get('/monthly', auth, async (req, res) => {
  try {
    const qarzlar = await db.all_p(`
      SELECT
        TO_CHAR(sana, 'Mon') AS oy,
        TO_CHAR(sana, 'YYYY-MM') AS oy_key,
        SUM(summa) AS qarz_summa,
        COUNT(*) AS qarz_soni
      FROM qarzlar
      WHERE user_id = $1
        AND sana >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY oy_key, oy
      ORDER BY oy_key
    `, [req.user.id]);

    const tolovlar = await db.all_p(`
      SELECT
        TO_CHAR(t.sana, 'Mon') AS oy,
        TO_CHAR(t.sana, 'YYYY-MM') AS oy_key,
        SUM(t.summa) AS tolov_summa
      FROM tolovlar t
      JOIN qarzlar q ON t.qarz_id = q.id
      WHERE q.user_id = $1
        AND t.sana >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY oy_key, oy
      ORDER BY oy_key
    `, [req.user.id]);

    const oyMap = {};
    qarzlar.forEach(r => {
      oyMap[r.oy_key] = {
        oy: r.oy,
        oy_key: r.oy_key,
        qarz: Number(r.qarz_summa),
        tolov: 0,
        soni: Number(r.qarz_soni)
      };
    });
    tolovlar.forEach(r => {
      if (oyMap[r.oy_key]) {
        oyMap[r.oy_key].tolov = Number(r.tolov_summa);
      } else {
        oyMap[r.oy_key] = { oy: r.oy, oy_key: r.oy_key, qarz: 0, tolov: Number(r.tolov_summa), soni: 0 };
      }
    });

    const result = Object.values(oyMap).sort((a, b) => a.oy_key > b.oy_key ? 1 : -1);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Top 5 qarzdor
router.get('/top-qarzdorlar', auth, async (req, res) => {
  try {
    const rows = await db.all_p(`
      SELECT
        q.id,
        q.ism || ' ' || COALESCE(q.familiya, '') AS ism,
        q.telefon,
        GREATEST(0,
          COALESCE(SUM(qz.summa), 0) -
          COALESCE((
            SELECT SUM(t.summa) FROM tolovlar t
            JOIN qarzlar qz2 ON t.qarz_id = qz2.id
            WHERE qz2.qarzdor_id = q.id
          ), 0)
        ) AS qarz
      FROM qarzdorlar q
      JOIN qarzlar qz ON qz.qarzdor_id = q.id
        AND qz.user_id = $1
        AND qz.status = 'active'
      WHERE q.user_id = $1
      GROUP BY q.id, q.ism, q.familiya, q.telefon
      ORDER BY qarz DESC
      LIMIT 5
    `, [req.user.id]);
    res.json(rows.map(r => ({ ...r, qarz: Number(r.qarz) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ YANGI: Qarz holati tarixi (har bir qarzning to'liq to'lov tarixi)
router.get('/qarz-tarixi/:qarzdor_id', auth, async (req, res) => {
  try {
    const qarzlar = await db.all_p(`
      SELECT qz.id, qz.summa, qz.sana, qz.muddat, qz.sabab, qz.status, qz.valyuta,
        GREATEST(0, qz.summa - COALESCE((SELECT SUM(t.summa) FROM tolovlar t WHERE t.qarz_id = qz.id), 0)) as qolgan_summa,
        (SELECT json_agg(
          json_build_object('id', t.id, 'summa', t.summa, 'sana', t.sana, 'izoh', t.izoh, 'created_at', t.created_at)
          ORDER BY t.sana DESC
        ) FROM tolovlar t WHERE t.qarz_id = qz.id) as tolovlar
      FROM qarzlar qz
      WHERE qz.qarzdor_id = $1 AND qz.user_id = $2
      ORDER BY qz.created_at DESC
    `, [req.params.qarzdor_id, req.user.id]);
    res.json(qarzlar);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;