import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SummaInput, { formatSum } from '../components/SummaInput';
import Avatar from '../components/Avatar';

function AddQarzModal({ qarzdorId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    summa: '', valyuta: 'UZS',
    sana: new Date().toISOString().split('T')[0],
    muddat: '', sabab: '', mahsulot_id: null, mahsulot_miqdor: 1
  });
  const [mahsulotlar, setMahsulotlar] = useState([]);
  const [selectedMahsulot, setSelectedMahsulot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mahsulotLoading, setMahsulotLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setMahsulotLoading(true);
    axios.get('/api/mahsulotlar')
      .then(r => setMahsulotlar(r.data))
      .catch(() => {})
      .finally(() => setMahsulotLoading(false));
  }, []);

  // Birlikni chiroyli ko'rsatish
  const birlikLabel = (birlik) => {
    const MAP = {
      'dona':'dona', 'quti':'quti', 'paket':'paket', 'juft':'juft',
      'g':'g', '50g':'50g', '100g':'100g', '250g':'250g', '500g':'500g',
      'kg':'kg', '2kg':'2kg', '5kg':'5kg', '10kg':'10kg', '25kg':'25kg qop', '50kg':'50kg qop',
      'ml':'ml', '100ml':'100ml', '200ml':'200ml', '250ml':'250ml', '330ml':'330ml',
      '0.5l':'0.5 litr', '0.75l':'0.75 litr', '1l':'1 litr', '1.5l':'1.5 litr',
      '2l':'2 litr', '3l':'3 litr', '5l':'5 litr', '10l':'10 litr', '19l':'19 litr',
      'litr':'litr', 'sm':'sm', 'metr':'m', 'm2':'m²', 'rol':'rulon',
      'soat':'soat', 'kun':'kun', 'oy':'oy', 'xizmat':'xizmat',
    };
    return MAP[birlik] || birlik || 'dona';
  };

  // Miqdor step — kasrli bo'lsa 0.1, aks holda 1
  const getMiqdorStep = (birlik) => {
    const kasrlilar = ['g','kg','litr','ml','metr','sm','m2','0.5l','0.75l','1l','1.5l','2l','3l','5l','10l','19l'];
    return kasrlilar.includes(birlik) ? '0.001' : '1';
  };

  const handleMahsulot = (e) => {
    const val = e.target.value;
    if (!val) {
      setSelectedMahsulot(null);
      setForm(f => ({ ...f, mahsulot_id: null, mahsulot_miqdor: 1, sabab: '' }));
      return;
    }
    const m = mahsulotlar.find(m => String(m.id) === val);
    if (m) {
      setSelectedMahsulot(m);
      setForm(f => ({
        ...f,
        mahsulot_id: m.id,
        summa: String(Number(m.narx) * 1),
        sabab: m.nomi,
        mahsulot_miqdor: 1
      }));
    }
  };

  const handleMiqdor = (val) => {
    const miqdor = parseFloat(val) || 1;
    setForm(f => ({
      ...f,
      mahsulot_miqdor: miqdor,
      summa: selectedMahsulot ? String(Number(selectedMahsulot.narx) * miqdor) : f.summa
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.summa || Number(form.summa) <= 0) return setError("Summa kiritilmadi");
    if (selectedMahsulot && Number(form.mahsulot_miqdor) > Number(selectedMahsulot.miqdor)) {
      return setError(`Yetarli mahsulot yo'q! Mavjud: ${selectedMahsulot.miqdor} ${birlikLabel(selectedMahsulot.birlik)}`);
    }
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/qarzlar', {
        ...form,
        qarzdor_id: qarzdorId,
        summa: Number(form.summa),
        mahsulot_miqdor: parseFloat(form.mahsulot_miqdor) || 1
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Xatolik");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💸 Yangi qarz qo'shish</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">⚠️ {error}</div>}

            {/* Mahsulotdan tanlash */}
            <div className="form-group">
              <label className="form-label">🛒 Mahsulotdan tanlash (ixtiyoriy)</label>
              {mahsulotLoading ? (
                <div style={{ padding: '10px', color: 'var(--text3)', fontSize: 13 }}>⏳ Mahsulotlar yuklanmoqda...</div>
              ) : mahsulotlar.length === 0 ? (
                <div style={{ padding: '10px', color: 'var(--text3)', fontSize: 13 }}>📦 Mahsulotlar qo'shilmagan</div>
              ) : (
                <select onChange={handleMahsulot} className="form-input" defaultValue="">
                  <option value="">— Qo'lda kiritish —</option>
                  {mahsulotlar.map(m => (
                    <option key={m.id} value={m.id} disabled={Number(m.miqdor) <= 0}>
                      {m.emoji || '📦'} {m.nomi} — {formatSum(m.narx)} so'm
                      {' '}({Number(m.miqdor)} {birlikLabel(m.birlik)} qoldi){Number(m.miqdor) <= 0 ? ' [TUGAGAN]' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Tanlangan mahsulot info */}
            {selectedMahsulot && (
              <div style={{
                background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px',
                marginBottom: 12, border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{selectedMahsulot.emoji || '📦'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedMahsulot.nomi}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                      Narxi: <strong>{formatSum(selectedMahsulot.narx)} so'm</strong> /
                      {birlikLabel(selectedMahsulot.birlik)}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Mavjud</div>
                    <div style={{
                      fontWeight: 700, fontSize: 15,
                      color: Number(selectedMahsulot.miqdor) < 5 ? '#f59e0b' : '#10b981'
                    }}>
                      {Number(selectedMahsulot.miqdor)} {birlikLabel(selectedMahsulot.birlik)}
                    </div>
                  </div>
                </div>

                {/* Miqdor input */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Nechta / qancha ({birlikLabel(selectedMahsulot.birlik)})
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0.001"
                      max={selectedMahsulot.miqdor}
                      step={getMiqdorStep(selectedMahsulot.birlik)}
                      value={form.mahsulot_miqdor}
                      onChange={e => handleMiqdor(e.target.value)}
                      className="form-input"
                      style={{ width: 120 }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                      {birlikLabel(selectedMahsulot.birlik)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>
                      = <strong style={{ color: 'var(--text)', fontSize: 14 }}>
                        {formatSum(Number(selectedMahsulot.narx) * Number(form.mahsulot_miqdor))} so'm
                      </strong>
                    </span>
                  </div>
                  {Number(form.mahsulot_miqdor) > Number(selectedMahsulot.miqdor) && (
                    <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                      ⚠️ Yetarli emas! Mavjud: {selectedMahsulot.miqdor} {birlikLabel(selectedMahsulot.birlik)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Summa + Valyuta */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Summa *</label>
                <SummaInput
                  value={form.summa}
                  onChange={val => setForm({...form, summa: val})}
                  placeholder="100 000"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Valyuta</label>
                <select value={form.valyuta} onChange={e => setForm({...form, valyuta: e.target.value})} className="form-input">
                  <option value="UZS">🇺🇿 UZS (so'm)</option>
                  <option value="USD">🇺🇸 USD (dollar)</option>
                  <option value="EUR">🇪🇺 EUR (yevro)</option>
                </select>
              </div>
            </div>

            {/* Sana + Muddat */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Qarz sanasi *</label>
                <input type="date" value={form.sana}
                  onChange={e => setForm({...form, sana: e.target.value})}
                  className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">Qaytarish muddati</label>
                <input type="date" value={form.muddat}
                  onChange={e => setForm({...form, muddat: e.target.value})}
                  className="form-input" />
              </div>
            </div>

            {/* Sabab */}
            <div className="form-group">
              <label className="form-label">Sabab / Izoh</label>
              <input value={form.sabab}
                onChange={e => setForm({...form, sabab: e.target.value})}
                className="form-input"
                placeholder="Masalan: oziq-ovqat, kiyim-kechak..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : "💸 Qarz qo'shish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function AddTolovModal({ qarzId, qarzSumma, onClose, onSuccess }) {
  const [form, setForm] = useState({ summa: '', sana: new Date().toISOString().split('T')[0], izoh: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.summa) return setError("Summa kiritilmadi");
    setLoading(true);
    try {
      await axios.post(`/api/qarzlar/${qarzId}/tolov`, { ...form, summa: Number(form.summa) });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Xatolik");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2>✅ To'lov qo'shish</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">⚠️ {error}</div>}
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--text2)' }}>
              Qolgan qarz: <strong style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono', fontSize: 15 }}>{formatSum(qarzSumma)} so'm</strong>
            </div>
            <div className="form-group">
              <label className="form-label">To'lov summasi *</label>
              <SummaInput value={form.summa} onChange={val => setForm({...form, summa: val})} placeholder={formatSum(qarzSumma)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Sana *</label>
              <input type="date" value={form.sana} onChange={e => setForm({...form, sana: e.target.value})} className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Izoh</label>
              <input value={form.izoh} onChange={e => setForm({...form, izoh: e.target.value})} className="form-input" placeholder="Ixtiyoriy..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor</button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? <span className="spinner" /> : "✅ To'lov saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ YANGI: Muddat uzaytirish modal
function MuddatModal({ qarzId, currentMuddat, onClose, onSuccess }) {
  const [yangiMuddat, setYangiMuddat] = useState('');
  const [sabab, setSabab] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!yangiMuddat) return setError("Yangi muddat kiriting");
    setLoading(true);
    try {
      await axios.put(`/api/qarzlar/${qarzId}/muddat`, { yangi_muddat: yangiMuddat, sabab });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Xatolik");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h2>📅 Muddatni uzaytirish</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">⚠️ {error}</div>}
            {currentMuddat && (
              <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--text2)' }}>
                Hozirgi muddat: <strong>{new Date(currentMuddat).toLocaleDateString('uz-UZ')}</strong>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Yangi muddat *</label>
              <input type="date" value={yangiMuddat} onChange={e => setYangiMuddat(e.target.value)} className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Sababni izoh (ixtiyoriy)</label>
              <input value={sabab} onChange={e => setSabab(e.target.value)} className="form-input" placeholder="Masalan: kelishuvga ko'ra..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : "📅 Saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function QarzdorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQarzModal, setShowQarzModal] = useState(false);
  const [showTolovModal, setShowTolovModal] = useState(null);
  const [showMuddatModal, setShowMuddatModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [eslatmaKopiyalandi, setEslatmaKopiyalandi] = useState(false);
  // ✅ YANGI: eslatma tahrirlash
  const [eslatmaEdit, setEslatmaEdit] = useState(false);
  const [eslatmaText, setEslatmaText] = useState('');
  const [eslatmaSaving, setEslatmaSaving] = useState(false);

  const load = useCallback(() => {
    axios.get(`/api/qarzdorlar/${id}`)
      .then(r => {
        setData(r.data);
        setEslatmaText(r.data.eslatma || '');
        setLoading(false);
      })
      .catch(() => navigate('/qarzdorlar'));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    await axios.delete(`/api/qarzdorlar/${id}`);
    navigate('/qarzdorlar');
  };

  const handleCloseQarz = async (qarzId) => {
    await axios.put(`/api/qarzlar/${qarzId}/close`);
    load();
  };

  // ✅ YANGI: Eslatma saqlash
  const handleEslatmaSave = async () => {
    setEslatmaSaving(true);
    try {
      await axios.put(`/api/qarzdorlar/${id}`, {
        ism: data.ism, familiya: data.familiya, telefon: data.telefon,
        telegram: data.telegram, instagram: data.instagram, whatsapp: data.whatsapp,
        manzil: data.manzil, izoh: data.izoh, eslatma: eslatmaText
      });
      setEslatmaEdit(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Xatolik");
    } finally { setEslatmaSaving(false); }
  };

  const printChek = (qarz) => {
    const win = window.open('', '_blank', 'width=320,height=500');
    const sana = new Date(qarz.sana).toLocaleDateString('uz-UZ');
    const qarzKod = qarz.qarz_raqam ? `QRZ-${String(qarz.qarz_raqam).padStart(4,'0')}` : '';
    win.document.write(`
      <html><head><title>Chek</title>
      <style>
        body{font-family:monospace;width:280px;margin:0 auto;padding:10px;font-size:12px}
        h2{text-align:center;font-size:14px;border-bottom:1px dashed #000;padding-bottom:6px}
        .row{display:flex;justify-content:space-between;margin:3px 0}
        .total{font-size:16px;font-weight:bold;border-top:1px dashed #000;padding-top:6px;margin-top:6px}
        .footer{text-align:center;margin-top:10px;font-size:10px;color:#666}
        .qrz{color:#999;font-size:10px;text-align:right}
      </style></head><body>
      <h2>🏪 Do'kon Qarz<br/><small>${data?.dokon_nomi || ''}</small></h2>
      ${qarzKod ? `<div class="qrz">#${qarzKod}</div>` : ''}
      <div class="row"><span>Qarzdor:</span><span>${data.ism} ${data.familiya || ''}</span></div>
      <div class="row"><span>Telefon:</span><span>${data.telefon}</span></div>
      <div class="row"><span>Sana:</span><span>${sana}</span></div>
      <div class="row"><span>Sabab:</span><span>${qarz.sabab || '—'}</span></div>
      <div class="row total"><span>Qarz summasi:</span><span>${Number(qarz.summa).toLocaleString('uz-UZ')} ${qarz.valyuta}</span></div>
      <div class="row"><span>To'langan:</span><span style="color:green">${Number(Number(qarz.summa)-Number(qarz.qolgan_summa)).toLocaleString('uz-UZ')} ${qarz.valyuta}</span></div>
      <div class="row"><span>Qolgan:</span><span style="color:red">${Number(qarz.qolgan_summa).toLocaleString('uz-UZ')} ${qarz.valyuta}</span></div>
      <div class="footer">${new Date().toLocaleString('uz-UZ')}<br/>Do'kon Qarz tizimi</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const copyEslatma = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setEslatmaKopiyalandi(true);
      setTimeout(() => setEslatmaKopiyalandi(false), 2000);
    });
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!data) return null;

  const activeQarzlar = data.qarzlar?.filter(q => q.status === 'active') || [];
  const paidQarzlar = data.qarzlar?.filter(q => q.status === 'paid') || [];
  const jami_qarz = activeQarzlar.reduce((s, q) => s + Number(q.qolgan_summa || 0), 0);

  const xabarMatni = `Assalomu alaykum ${data.ism}! Do'konimizdan qarzingiz bor edi: ${formatSum(jami_qarz)} so'm. Iltimos, imkoningiz bo'lsa to'lab qo'ysangiz. Rahmat! 🙏`;

  return (
    <div>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/qarzdorlar')} style={{ marginBottom: 20 }}>
        ← Orqaga
      </button>

      <div className="detail-header">
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flex: 1, flexWrap: 'wrap' }}>
          <Avatar name={`${data.ism} ${data.familiya || ''}`} size={64} radius={16} fontSize={24} />
          <div className="detail-info">
            <h1>{data.ism} {data.familiya}</h1>
            <div className="contact-links" style={{ marginBottom: 8 }}>
              <a href={`tel:${data.telefon}`} className="contact-link cl-phone">📞 {data.telefon}</a>
              {data.telegram && (
                <a href={data.telegram.startsWith('+') ? `https://t.me/${data.telegram}` : `https://t.me/${data.telegram.replace('@','')}`}
                  target="_blank" rel="noreferrer" className="contact-link cl-telegram">
                  ✈️ {data.telegram}
                </a>
              )}
              {data.whatsapp && (
                <a href={`https://wa.me/${data.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="contact-link cl-whatsapp">
                  💬 {data.whatsapp}
                </a>
              )}
              {data.instagram && (
                <a href={`https://instagram.com/${data.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="contact-link cl-instagram">
                  📸 {data.instagram}
                </a>
              )}
            </div>
            {data.manzil && <p>📍 {data.manzil}</p>}
            {data.izoh && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>💬 {data.izoh}</p>}
          </div>
        </div>
        <div className="detail-total">
          <div className="detail-total-label">Jami qarz</div>
          <div className="detail-total-value">{formatSum(jami_qarz)} so'm</div>
        </div>
      </div>

      {/* ✅ YANGI: Shaxsiy eslatma */}
      <div className="table-card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: eslatmaEdit ? 10 : 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>📝 Shaxsiy eslatma</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setEslatmaEdit(!eslatmaEdit)}
            >
              {eslatmaEdit ? 'Bekor' : '✏️ Tahrirlash'}
            </button>
          </div>
          {eslatmaEdit ? (
            <div>
              <textarea
                value={eslatmaText}
                onChange={e => setEslatmaText(e.target.value)}
                className="form-input"
                rows={3}
                placeholder={`Masalan: "garov bor", "ishonchli", "ehtiyot bo'l"...`}
                style={{ resize: 'vertical', fontSize: 13 }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleEslatmaSave}
                disabled={eslatmaSaving}
                style={{ marginTop: 8 }}
              >
                {eslatmaSaving ? '⏳ Saqlanmoqda...' : '💾 Saqlash'}
              </button>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: data.eslatma ? 'var(--text)' : 'var(--text3)', fontStyle: data.eslatma ? 'normal' : 'italic' }}>
              {data.eslatma || "Eslatma yo'q"}
            </p>
          )}
        </div>
      </div>

      {jami_qarz > 0 && (
        <div className="eslatma-card">
          <h3>📤 Qarz xabari yuborish</h3>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
            Bir tugma bilan WhatsApp/Telegram ga tayyor matn
          </p>
          <div className="eslatma-buttons">
            <a href={`tel:${data.telefon}`} className="eslatma-btn eslatma-phone">📞 Qo'ng'iroq</a>
            {data.telegram && (
              <a href={`https://t.me/${data.telegram.startsWith('+') ? data.telegram : data.telegram.replace('@','')}`}
                target="_blank" rel="noreferrer" className="eslatma-btn eslatma-telegram">
                ✈️ Telegram
              </a>
            )}
            {data.whatsapp && (
              <a href={`https://wa.me/${data.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(xabarMatni)}`}
                target="_blank" rel="noreferrer" className="eslatma-btn eslatma-whatsapp">
                💬 WhatsApp
              </a>
            )}
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, fontSize: 12, color: 'var(--text2)', borderLeft: '3px solid var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ userSelect: 'all', flex: 1 }}>{xabarMatni}</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => copyEslatma(xabarMatni)}
              style={{ flexShrink: 0 }}
            >
              {eslatmaKopiyalandi ? '✅ Kopiyalandi' : '📋 Nusxa'}
            </button>
          </div>
        </div>
      )}

      <div className="table-card" style={{ marginBottom: 20 }}>
        <div className="table-header">
          <h3>💸 Faol qarzlar ({activeQarzlar.length})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowQarzModal(true)}>
            ➕ Qarz qo'shish
          </button>
        </div>
        {activeQarzlar.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <h3>Faol qarz yo'q</h3>
          </div>
        ) : (
          activeQarzlar.map(qarz => (
            <div key={qarz.id} className="qarz-item">
              <div className="qarz-item-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {/* ✅ YANGI: Qarz raqami */}
                  {qarz.qarz_raqam > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'rgba(99,102,241,0.1)', padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace' }}>
                      QRZ-{String(qarz.qarz_raqam).padStart(4, '0')}
                    </span>
                  )}
                  <span className="qarz-item-sabab">{qarz.sabab || "Sabab ko'rsatilmagan"}</span>
                  {qarz.mahsulot_nomi && (
                    <span style={{
                      fontSize: 11, background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                      padding: '2px 8px', borderRadius: 6, fontWeight: 600, marginLeft: 4,
                      display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                      {qarz.mahsulot_emoji} {qarz.mahsulot_nomi}
                      {qarz.mahsulot_miqdor && (
                        <span style={{ background: 'rgba(99,102,241,0.2)', borderRadius: 4, padding: '0 5px' }}>
                          {Number(qarz.mahsulot_miqdor)} {qarz.mahsulot_birlik || qarz.mahsulot_birlik_asl || ''}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="qarz-item-date">
                  📅 {new Date(qarz.sana).toLocaleDateString('uz-UZ')}
                  {qarz.muddat && (
                    <span style={{ marginLeft: 8 }}>
                      | ⏰ Muddat: {new Date(qarz.muddat).toLocaleDateString('uz-UZ')}
                      {new Date(qarz.muddat) < new Date() && (
                        <span className="badge badge-red" style={{ marginLeft: 6 }}>O'tgan!</span>
                      )}
                    </span>
                  )}
                </div>

                {/* ✅ YANGI: To'lov tarixi */}
                {qarz.tolovlar && qarz.tolovlar.length > 0 && (
                  <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid var(--accent)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>To'lovlar tarixi:</div>
                    {qarz.tolovlar.map((t, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 8, marginBottom: 2 }}>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>+{formatSum(t.summa)}</span>
                        <span>{new Date(t.sana).toLocaleDateString('uz-UZ')}</span>
                        {t.izoh && <span style={{ color: 'var(--text3)' }}>— {t.izoh}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="qarz-item-amount">
                <div className="qarz-item-total amount-red">{formatSum(qarz.qolgan_summa)} {qarz.valyuta}</div>
                {Number(qarz.summa) !== Number(qarz.qolgan_summa) && (
                  <div className="qarz-item-paid">
                    Jami: {formatSum(qarz.summa)} | To'langan: {formatSum(Number(qarz.summa) - Number(qarz.qolgan_summa))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn btn-success btn-sm" onClick={() => setShowTolovModal(qarz)}>
                  ✅ To'lov
                </button>
                {/* ✅ YANGI: Muddat uzaytirish */}
                <button className="btn btn-secondary btn-sm" onClick={() => setShowMuddatModal(qarz)} title="Muddatni uzaytirish">
                  📅 Muddat
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => printChek(qarz)} title="Chek chiqarish">
                  🖨️
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleCloseQarz(qarz.id)}>
                  Yopish
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {paidQarzlar.length > 0 && (
        <div className="table-card" style={{ marginBottom: 20 }}>
          <div className="table-header">
            <h3>✅ To'langan qarzlar ({paidQarzlar.length})</h3>
          </div>
          {paidQarzlar.map(qarz => (
            <div key={qarz.id} className="qarz-item" style={{ opacity: 0.6 }}>
              <div className="qarz-item-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {qarz.qarz_raqam > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'rgba(99,102,241,0.1)', padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace' }}>
                      QRZ-{String(qarz.qarz_raqam).padStart(4, '0')}
                    </span>
                  )}
                  <span className="qarz-item-sabab">{qarz.sabab || "Sabab ko'rsatilmagan"}</span>
                </div>
                <div className="qarz-item-date">{new Date(qarz.sana).toLocaleDateString('uz-UZ')}</div>
              </div>
              <div className="qarz-item-amount">
                <div className="qarz-item-total amount-green">{formatSum(qarz.summa)} {qarz.valyuta}</div>
              </div>
              <span className="badge badge-green">✅ To'langan</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => navigate(`/qarzdorlar/${id}/tahrirlash`)}>
          ✏️ Tahrirlash
        </button>
        {!deleteConfirm ? (
          <button className="btn btn-danger" onClick={() => setDeleteConfirm(true)}>🗑️ O'chirish</button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--red)' }}>Rostdan ham o'chirasizmi?</span>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Ha, o'chir</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirm(false)}>Yo'q</button>
          </div>
        )}
      </div>

      {showQarzModal && (
        <AddQarzModal qarzdorId={id} onClose={() => setShowQarzModal(false)}
          onSuccess={() => { setShowQarzModal(false); load(); }} />
      )}
      {showTolovModal && (
        <AddTolovModal qarzId={showTolovModal.id} qarzSumma={showTolovModal.qolgan_summa}
          onClose={() => setShowTolovModal(null)}
          onSuccess={() => { setShowTolovModal(null); load(); }} />
      )}
      {showMuddatModal && (
        <MuddatModal
          qarzId={showMuddatModal.id}
          currentMuddat={showMuddatModal.muddat}
          onClose={() => setShowMuddatModal(null)}
          onSuccess={() => { setShowMuddatModal(null); load(); }}
        />
      )}
    </div>
  );
}