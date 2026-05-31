import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function formatSum(n) {
  return Number(n || 0).toLocaleString('uz-UZ');
}

export default function Mahsulotlar() {
  const [mahsulotlar, setMahsulotlar] = useState([]);
  const [kategoriyalar, setKategoriyalar] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedKat, setSelectedKat] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'mahsulot' | 'kategoriya'
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ nomi: '', kategoriya_id: '', narx: '', miqdor: '', birlik: 'dona', izoh: '' });
  const [katForm, setKatForm] = useState({ nomi: '', rang: '#6366f1', emoji: '📦' });

  const load = async () => {
    try {
      const [m, k, s] = await Promise.all([
        axios.get(`/api/mahsulotlar?kategoriya_id=${selectedKat}&search=${search}`),
        axios.get('/api/mahsulotlar/kategoriyalar'),
        axios.get('/api/mahsulotlar/stats'),
      ]);
      setMahsulotlar(m.data);
      setKategoriyalar(k.data);
      setStats(s.data);
    } catch (err) {
      toast.error('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedKat, search]);

  const openAdd = () => { setEditItem(null); setForm({ nomi: '', kategoriya_id: '', narx: '', miqdor: '', birlik: 'dona', izoh: '' }); setModal('mahsulot'); };
  const openEdit = (m) => { setEditItem(m); setForm({ nomi: m.nomi, kategoriya_id: m.kategoriya_id || '', narx: m.narx, miqdor: m.miqdor, birlik: m.birlik, izoh: m.izoh || '' }); setModal('mahsulot'); };

  const saveMahsulot = async () => {
    if (!form.nomi || !form.narx) return toast.error('Nomi va narx kerak');
    try {
      if (editItem) {
        await axios.put(`/api/mahsulotlar/${editItem.id}`, form);
        toast.success('Yangilandi');
      } else {
        await axios.post('/api/mahsulotlar', form);
        toast.success("Qo'shildi");
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
    toast.success("O'chirildi");
    load();
  };

  const saveKategoriya = async () => {
    if (!katForm.nomi) return toast.error('Nom kerak');
    try {
      await axios.post('/api/mahsulotlar/kategoriyalar', katForm);
      toast.success("Kategoriya qo'shildi");
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
    toast.success("O'chirildi");
    load();
  };

  const EMOJIS = ['📦', '🥤', '🍬', '🍫', '🥛', '🍞', '🧴', '🧹', '❄️', '🔧', '👕', '📱'];

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📦 Mahsulotlar</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Dokon inventarini boshqaring</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setModal('kategoriya')}>🗂️ Kategoriya</button>
          <button className="btn btn-primary" onClick={openAdd}>➕ Mahsulot</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card purple">
            <div className="stat-icon">📦</div>
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

      {/* Kategoriyalar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          className={`btn btn-sm ${selectedKat === '' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedKat('')}
        >Hammasi</button>
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

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          className="form-input"
          placeholder="🔍 Mahsulot qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
      </div>

      {/* Mahsulotlar jadvali */}
      <div className="table-card">
        {mahsulotlar.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <p>Mahsulot topilmadi</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openAdd}>➕ Birinchi mahsulotni qo'shing</button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nomi</th>
                <th>Kategoriya</th>
                <th>Narx</th>
                <th>Miqdor</th>
                <th>Umumiy qiymat</th>
                <th>Harakatlar</th>
              </tr>
            </thead>
            <tbody>
              {mahsulotlar.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.nomi}</td>
                  <td>
                    {m.kategoriya_nomi ? (
                      <span style={{ background: m.rang + '33', color: m.rang, padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>
                        {m.emoji} {m.kategoriya_nomi}
                      </span>
                    ) : <span style={{ color: 'var(--text2)' }}>—</span>}
                  </td>
                  <td>{formatSum(m.narx)} so'm/{m.birlik}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: Number(m.miqdor) < 5 ? '#ef4444' : 'var(--text)' }}>
                      {m.miqdor} {m.birlik}
                    </span>
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

      {/* Mahsulot modali */}
      {modal === 'mahsulot' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? 'Mahsulot tahrirlash' : "Mahsulot qo'shish"}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Mahsulot nomi *</label>
                <input className="form-input" value={form.nomi} onChange={e => setForm({ ...form, nomi: e.target.value })} placeholder="Masalan: Coca-Cola 1L" />
              </div>
              <div className="form-group">
                <label className="form-label">Kategoriya</label>
                <select className="form-input" value={form.kategoriya_id} onChange={e => setForm({ ...form, kategoriya_id: e.target.value })}>
                  <option value="">— Kategoriyasiz —</option>
                  {kategoriyalar.map(k => <option key={k.id} value={k.id}>{k.emoji} {k.nomi}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Narx (so'm) *</label>
                  <input className="form-input" type="number" value={form.narx} onChange={e => setForm({ ...form, narx: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Miqdor</label>
                  <input className="form-input" type="number" value={form.miqdor} onChange={e => setForm({ ...form, miqdor: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Birlik</label>
                <select className="form-input" value={form.birlik} onChange={e => setForm({ ...form, birlik: e.target.value })}>
                  {['dona', 'kg', 'litr', 'metr', 'quti', 'paket', 'juft'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Izoh</label>
                <input className="form-input" value={form.izoh} onChange={e => setForm({ ...form, izoh: e.target.value })} placeholder="Ixtiyoriy izoh" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Bekor</button>
              <button className="btn btn-primary" onClick={saveMahsulot}>{editItem ? 'Saqlash' : "Qo'shish"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Kategoriya modali */}
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
                <input className="form-input" value={katForm.nomi} onChange={e => setKatForm({ ...katForm, nomi: e.target.value })} placeholder="Masalan: Ichimliklар" />
              </div>
              <div className="form-group">
                <label className="form-label">Emoji</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EMOJIS.map(em => (
                    <button key={em} onClick={() => setKatForm({ ...katForm, emoji: em })}
                      style={{ fontSize: 24, background: katForm.emoji === em ? 'var(--primary)' : 'var(--bg)', border: '2px solid', borderColor: katForm.emoji === em ? 'var(--primary)' : 'var(--border)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Rang</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'].map(r => (
                    <button key={r} onClick={() => setKatForm({ ...katForm, rang: r })}
                      style={{ width: 36, height: 36, borderRadius: '50%', background: r, border: katForm.rang === r ? '3px solid white' : '3px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Bekor</button>
              <button className="btn btn-primary" onClick={saveKategoriya}>Saqlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}