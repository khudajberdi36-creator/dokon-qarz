import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// =====================
// FORMATTERS
// =====================
function formatSum(n) {
  return Number(n || 0).toLocaleString('uz-UZ');
}

// 12000 → "12 000" kiritish uchun
function formatInput(val) {
  const raw = String(val).replace(/\s/g, '');
  if (!raw || isNaN(raw)) return val;
  return Number(raw).toLocaleString('uz-UZ');
}

function unformat(val) {
  return String(val).replace(/\s/g, '').replace(/,/g, '.');
}

// =====================
// BIRLIKLAR — to'liq ro'yxat
// =====================
const BIRLIK_GROUPS = [
  {
    group: '📦 Dona / Hisob',
    items: [
      { value: 'dona',   label: 'Dona' },
      { value: 'quti',   label: 'Quti' },
      { value: 'paket',  label: 'Paket' },
      { value: 'juft',   label: 'Juft (poyabzal, qo\'lqop...)' },
      { value: 'to\'plam', label: 'To\'plam' },
      { value: 'varaq',  label: 'Varaq' },
      { value: 'tayoq',  label: 'Tayoq / Stick' },
    ]
  },
  {
    group: '⚖️ Og\'irlik',
    items: [
      { value: 'g',      label: 'Gramm (g)' },
      { value: '50g',    label: '50 gramm' },
      { value: '100g',   label: '100 gramm' },
      { value: '200g',   label: '200 gramm' },
      { value: '250g',   label: '250 gramm' },
      { value: '500g',   label: '500 gramm (yarim kg)' },
      { value: 'kg',     label: 'Kilogramm (kg)' },
      { value: '2kg',    label: '2 kg' },
      { value: '5kg',    label: '5 kg' },
      { value: '10kg',   label: '10 kg' },
      { value: '25kg',   label: '25 kg (qop)' },
      { value: '50kg',   label: '50 kg (qop)' },
    ]
  },
  {
    group: '🧴 Hajm (suyuqlik)',
    items: [
      { value: 'ml',     label: 'Millilitr (ml)' },
      { value: '100ml',  label: '100 ml' },
      { value: '200ml',  label: '200 ml' },
      { value: '250ml',  label: '250 ml' },
      { value: '330ml',  label: '330 ml (bank)' },
      { value: '0.5l',   label: '0.5 litr (yarim litr)' },
      { value: '0.75l',  label: '0.75 litr' },
      { value: '1l',     label: '1 litr' },
      { value: '1.5l',   label: '1.5 litr' },
      { value: '2l',     label: '2 litr' },
      { value: '3l',     label: '3 litr' },
      { value: '5l',     label: '5 litr' },
      { value: '10l',    label: '10 litr' },
      { value: '19l',    label: '19 litr (biddon)' },
      { value: 'litr',   label: 'Litr (ixtiyoriy)' },
    ]
  },
  {
    group: '📏 Uzunlik / Maydon',
    items: [
      { value: 'sm',     label: 'Santimetr (sm)' },
      { value: 'metr',   label: 'Metr' },
      { value: 'm2',     label: 'Kvadrat metr (m²)' },
      { value: 'rol',    label: 'Rulon' },
    ]
  },
  {
    group: '⏱️ Vaqt / Xizmat',
    items: [
      { value: 'soat',   label: 'Soat' },
      { value: 'kun',    label: 'Kun' },
      { value: 'oy',     label: 'Oy' },
      { value: 'xizmat', label: 'Xizmat (1 marta)' },
    ]
  },
];

// Barcha birliklar flat ro'yxat
const ALL_BIRLIKLAR = BIRLIK_GROUPS.flatMap(g => g.items);

// Birlik labelini topish
function getBirlikLabel(value) {
  const found = ALL_BIRLIKLAR.find(b => b.value === value);
  return found ? found.label : value;
}

// Miqdor + birlik chiroyli ko'rsatish
function showMiqdor(miqdor, birlik) {
  const m = Number(miqdor || 0);
  const label = getBirlikLabel(birlik);
  return `${m % 1 === 0 ? m : m} ${label}`;
}

// =====================
// KATEGORIYA EMOJILAR
// =====================
const EMOJIS = [
  '📦','🥤','🍬','🍫','🥛','🍞','🧴','🧹',
  '❄️','🔧','👕','📱','🍎','🥩','🧆','☕',
  '🍵','🧃','🍺','🥫','🧂','🫙','🛒','🏠',
];

// =====================
// KOMPONENT
// =====================
export default function Mahsulotlar() {
  const [mahsulotlar, setMahsulotlar] = useState([]);
  const [kategoriyalar, setKategoriyalar] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedKat, setSelectedKat] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const emptyForm = { nomi: '', kategoriya_id: '', narx: '', miqdor: '', birlik: 'dona', izoh: '' };
  const [form, setForm] = useState(emptyForm);
  const [narxDisplay, setNarxDisplay] = useState(''); // formatlangan ko'rsatish uchun

  const [katForm, setKatForm] = useState({ nomi: '', rang: '#6366f1', emoji: '📦' });
  const [customBirlik, setCustomBirlik] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, k, s] = await Promise.all([
        axios.get(`/api/mahsulotlar?kategoriya_id=${selectedKat}&search=${search}`),
        axios.get('/api/mahsulotlar/kategoriyalar'),
        axios.get('/api/mahsulotlar/stats'),
      ]);
      setMahsulotlar(m.data);
      setKategoriyalar(k.data);
      setStats(s.data);
    } catch {
      toast.error('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [selectedKat, search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setNarxDisplay('');
    setCustomBirlik(false);
    setModal('mahsulot');
  };

  const openEdit = (m) => {
    setEditItem(m);
    setForm({ nomi: m.nomi, kategoriya_id: m.kategoriya_id || '', narx: m.narx, miqdor: m.miqdor, birlik: m.birlik, izoh: m.izoh || '' });
    setNarxDisplay(formatSum(m.narx));
    const known = ALL_BIRLIKLAR.find(b => b.value === m.birlik);
    setCustomBirlik(!known);
    setModal('mahsulot');
  };

  // Narx input — kiritayotganda vergul qo'yish
  const handleNarxChange = (e) => {
    const raw = e.target.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
    setForm(f => ({ ...f, narx: raw }));
    if (raw) setNarxDisplay(Number(raw).toLocaleString('uz-UZ'));
    else setNarxDisplay('');
  };

  const saveMahsulot = async () => {
    if (!form.nomi.trim()) return toast.error('Mahsulot nomi kiritilmadi');
    if (!form.narx) return toast.error('Narx kiritilmadi');
    try {
      const payload = { ...form, narx: Number(unformat(form.narx)), miqdor: Number(unformat(form.miqdor)) || 0 };
      if (editItem) {
        await axios.put(`/api/mahsulotlar/${editItem.id}`, payload);
        toast.success('✅ Yangilandi');
      } else {
        await axios.post('/api/mahsulotlar', payload);
        toast.success("✅ Qo'shildi");
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Xatolik');
    }
  };

  const deleteMahsulot = async (id) => {
    if (!window.confirm("O'chirishga ishonchingiz komilmi?")) return;
    await axios.delete(`/api/mahsulotlar/${id}`);
    toast.success("🗑️ O'chirildi");
    load();
  };

  const saveKategoriya = async () => {
    if (!katForm.nomi) return toast.error('Nom kerak');
    try {
      await axios.post('/api/mahsulotlar/kategoriyalar', katForm);
      toast.success("✅ Kategoriya qo'shildi");
      setModal(null);
      setKatForm({ nomi: '', rang: '#6366f1', emoji: '📦' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Xatolik');
    }
  };

  const deleteKategoriya = async (id) => {
    if (!window.confirm("O'chirishga ishonchingiz komilmi?")) return;
    await axios.delete(`/api/mahsulotlar/kategoriyalar/${id}`);
    toast.success("🗑️ O'chirildi");
    load();
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🛒 Mahsulotlar</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Do'kon inventarini boshqaring</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setModal('kategoriya')}>🗂️ Kategoriya</button>
          <button className="btn btn-primary" onClick={openAdd}>＋ Mahsulot</button>
        </div>
      </div>

      {/* Stat kartochkalar */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card purple">
            <div className="stat-icon">🛒</div>
            <div className="stat-label">Jami mahsulot</div>
            <div className="stat-value">{stats.jami_mahsulot}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">💰</div>
            <div className="stat-label">Umumiy qiymat</div>
            <div className="stat-value" style={{ fontSize: 16 }}>{formatSum(stats.umumiy_qiymat)} so'm</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-icon">📊</div>
            <div className="stat-label">Jami miqdor</div>
            <div className="stat-value">{formatSum(stats.jami_miqdor)}</div>
          </div>
        </div>
      )}

      {/* Kategoriya filterlari */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className={`btn btn-sm ${selectedKat === '' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSelectedKat('')}>
          Hammasi
        </button>
        {kategoriyalar.map(k => (
          <button
            key={k.id}
            className={`btn btn-sm ${selectedKat == k.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedKat(k.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {k.emoji} {k.nomi}
            <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{k.mahsulot_soni}</span>
          </button>
        ))}
      </div>

      {/* Qidiruv */}
      <div style={{ marginBottom: 16 }}>
        <input className="form-input" placeholder="🔍 Mahsulot qidirish..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
      </div>

      {/* Jadval */}
      <div className="table-card">
        {mahsulotlar.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
            <p>Mahsulot topilmadi</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openAdd}>＋ Birinchi mahsulotni qo'shing</button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th>Kategoriya</th>
                <th>Narx</th>
                <th>Miqdor</th>
                <th>Umumiy qiymat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mahsulotlar.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.nomi}</div>
                    {m.izoh && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{m.izoh}</div>}
                  </td>
                  <td>
                    {m.kategoriya_nomi
                      ? <span style={{ background: m.rang + '33', color: m.rang, padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>{m.emoji} {m.kategoriya_nomi}</span>
                      : <span style={{ color: 'var(--text3)' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{formatSum(m.narx)} so'm</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      1 {getBirlikLabel(m.birlik)} uchun
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{
                        fontWeight: 700, fontSize: 15,
                        color: Number(m.miqdor) === 0 ? '#ef4444' : Number(m.miqdor) < 5 ? '#f59e0b' : '#10b981'
                      }}>
                        {Number(m.miqdor) === 0 && '⚠️ '}
                        {Number(m.miqdor) % 1 === 0 ? Number(m.miqdor) : Number(m.miqdor)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
                        {getBirlikLabel(m.birlik)}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: '#10b981' }}>{formatSum(m.umumiy_qiymat)} so'm</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(m)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteMahsulot(m.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Kategoriyalar ro'yxati */}
      {kategoriyalar.length > 0 && (
        <div className="table-card" style={{ marginTop: 20 }}>
          <div className="table-header"><h3>🗂️ Kategoriyalar</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, padding: 16 }}>
            {kategoriyalar.map(k => (
              <div key={k.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, border: `2px solid ${k.rang}33`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 24 }}>{k.emoji}</div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>{k.nomi}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{k.mahsulot_soni} mahsulot</div>
                  <div style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>{formatSum(k.umumiy_qiymat)} so'm</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => deleteKategoriya(k.id)}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== MAHSULOT MODALI ===================== */}
      {modal === 'mahsulot' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? '✏️ Mahsulot tahrirlash' : '➕ Mahsulot qo\'shish'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Nomi */}
              <div className="form-group">
                <label className="form-label">Mahsulot nomi *</label>
                <input className="form-input" value={form.nomi}
                  onChange={e => setForm({ ...form, nomi: e.target.value })}
                  placeholder="Masalan: Coca-Cola 1.5L, Shakar, Non..." />
              </div>

              {/* Kategoriya */}
              <div className="form-group">
                <label className="form-label">Kategoriya</label>
                <select className="form-input" value={form.kategoriya_id}
                  onChange={e => setForm({ ...form, kategoriya_id: e.target.value })}>
                  <option value="">— Kategoriyasiz —</option>
                  {kategoriyalar.map(k => <option key={k.id} value={k.id}>{k.emoji} {k.nomi}</option>)}
                </select>
              </div>

              {/* Narx — formatlangan */}
              <div className="form-group">
                <label className="form-label">Narx (so'm) *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    value={narxDisplay}
                    onChange={handleNarxChange}
                    placeholder="12 000"
                    inputMode="numeric"
                    style={{ paddingRight: 60 }}
                  />
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 12, color: 'var(--text3)', pointerEvents: 'none'
                  }}>so'm</span>
                </div>
                {form.narx && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    = {formatSum(form.narx)} so'm
                  </div>
                )}
              </div>

              {/* Miqdor + Birlik */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Miqdor</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.miqdor}
                    onChange={e => setForm({ ...form, miqdor: e.target.value })}
                    placeholder="0"
                  />
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
                    1.5, 0.5, 250 va h.k.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Birlik</label>
                  {!customBirlik ? (
                    <>
                      <select
                        className="form-input"
                        value={form.birlik}
                        onChange={e => {
                          if (e.target.value === '__custom__') { setCustomBirlik(true); setForm(f => ({ ...f, birlik: '' })); }
                          else setForm(f => ({ ...f, birlik: e.target.value }));
                        }}
                      >
                        {BIRLIK_GROUPS.map(g => (
                          <optgroup key={g.group} label={g.group}>
                            {g.items.map(b => (
                              <option key={b.value} value={b.value}>{b.label}</option>
                            ))}
                          </optgroup>
                        ))}
                        <optgroup label="✏️ Boshqa">
                          <option value="__custom__">Boshqa (qo'lda yozish)</option>
                        </optgroup>
                      </select>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        className="form-input"
                        value={form.birlik}
                        onChange={e => setForm(f => ({ ...f, birlik: e.target.value }))}
                        placeholder="o'z birligingiz"
                        autoFocus
                      />
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setCustomBirlik(false); setForm(f => ({ ...f, birlik: 'dona' })); }}
                        style={{ whiteSpace: 'nowrap' }}
                      >✕</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Ko'rinish preview */}
              {form.narx && form.birlik && (
                <div style={{
                  background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px',
                  fontSize: 13, color: 'var(--text2)', marginBottom: 8,
                  display: 'flex', gap: 8, alignItems: 'center'
                }}>
                  <span>👁️</span>
                  <span>
                    Ko'rinish: <strong style={{ color: 'var(--text)' }}>
                      {formatSum(form.narx)} so'm / {getBirlikLabel(form.birlik)}
                    </strong>
                    {form.miqdor && <span> · Miqdor: <strong style={{ color: 'var(--text)' }}>{form.miqdor} {getBirlikLabel(form.birlik)}</strong></span>}
                  </span>
                </div>
              )}

              {/* Izoh */}
              <div className="form-group">
                <label className="form-label">Izoh (ixtiyoriy)</label>
                <input className="form-input" value={form.izoh}
                  onChange={e => setForm({ ...form, izoh: e.target.value })}
                  placeholder="Masalan: Import, Qo'shimcha ma'lumot..." />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Bekor</button>
              <button className="btn btn-primary" onClick={saveMahsulot}>
                {editItem ? '💾 Saqlash' : "➕ Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== KATEGORIYA MODALI ===================== */}
      {modal === 'kategoriya' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗂️ Yangi kategoriya</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Kategoriya nomi *</label>
                <input className="form-input" value={katForm.nomi}
                  onChange={e => setKatForm({ ...katForm, nomi: e.target.value })}
                  placeholder="Masalan: Ichimliklar, Un-yog' mahsulotlar..." />
              </div>
              <div className="form-group">
                <label className="form-label">Emoji tanlang</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EMOJIS.map(em => (
                    <button key={em} onClick={() => setKatForm({ ...katForm, emoji: em })}
                      style={{
                        fontSize: 22, background: katForm.emoji === em ? 'var(--primary)' : 'var(--bg)',
                        border: '2px solid', borderColor: katForm.emoji === em ? 'var(--primary)' : 'var(--border)',
                        borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
                        transform: katForm.emoji === em ? 'scale(1.2)' : 'scale(1)',
                        transition: 'all 0.15s',
                      }}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Rang</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['#6366f1','#10b981','#ef4444','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#06b6d4','#f97316','#84cc16'].map(r => (
                    <button key={r} onClick={() => setKatForm({ ...katForm, rang: r })}
                      style={{
                        width: 36, height: 36, borderRadius: '50%', background: r,
                        border: katForm.rang === r ? '3px solid white' : '3px solid transparent',
                        cursor: 'pointer', transition: 'transform 0.15s',
                        transform: katForm.rang === r ? 'scale(1.2)' : 'scale(1)',
                        boxShadow: katForm.rang === r ? `0 0 0 2px ${r}` : 'none',
                      }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Bekor</button>
              <button className="btn btn-primary" onClick={saveKategoriya}>✅ Saqlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}