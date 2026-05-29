import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SummaInput, { formatSum } from '../components/SummaInput';

function AddQarzModal({ qarzdorId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    summa: '', valyuta: 'UZS',
    sana: new Date().toISOString().split('T')[0],
    muddat: '', sabab: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.summa) return setError("Summa kiritilmadi");
    setLoading(true);
    try {
      await axios.post('/api/qarzlar', { ...form, qarzdor_id: qarzdorId, summa: Number(form.summa) });
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
                  <option value="UZS">UZS (so'm)</option>
                  <option value="USD">USD (dollar)</option>
                  <option value="EUR">EUR (yevro)</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Qarz sanasi *</label>
                <input type="date" value={form.sana} onChange={e => setForm({...form, sana: e.target.value})}
                  className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">Qaytarish muddati</label>
                <input type="date" value={form.muddat} onChange={e => setForm({...form, muddat: e.target.value})}
                  className="form-input" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Sabab / Izoh</label>
              <input value={form.sabab} onChange={e => setForm({...form, sabab: e.target.value})}
                className="form-input" placeholder="Masalan: oziq-ovqat, kiyim-kechak..." />
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
              Qarz summasi: <strong style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono', fontSize: 15 }}>{formatSum(qarzSumma)} so'm</strong>
            </div>
            <div className="form-group">
              <label className="form-label">To'lov summasi *</label>
              <SummaInput
                value={form.summa}
                onChange={val => setForm({...form, summa: val})}
                placeholder={formatSum(qarzSumma)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sana *</label>
              <input type="date" value={form.sana} onChange={e => setForm({...form, sana: e.target.value})}
                className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Izoh</label>
              <input value={form.izoh} onChange={e => setForm({...form, izoh: e.target.value})}
                className="form-input" placeholder="Ixtiyoriy..." />
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

export default function QarzdorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQarzModal, setShowQarzModal] = useState(false);
  const [showTolovModal, setShowTolovModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const load = useCallback(() => {
    axios.get(`/api/qarzdorlar/${id}`)
      .then(r => { setData(r.data); setLoading(false); })
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

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!data) return null;

  const activeQarzlar = data.qarzlar?.filter(q => q.status === 'active') || [];
  const paidQarzlar = data.qarzlar?.filter(q => q.status === 'paid') || [];
  const jami_qarz = activeQarzlar.reduce((s, q) => s + Number(q.qolgan_summa || 0), 0);

  const eslatmaText = `Assalomu alaykum ${data.ism}! Do'konimizdan qarzingiz bor edi: ${formatSum(jami_qarz)} so'm. Iltimos, imkoningiz bo'lsa to'lab qo'ysangiz. Rahmat! 🙏`;

  return (
    <div>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/qarzdorlar')} style={{ marginBottom: 20 }}>
        ← Orqaga
      </button>

      <div className="detail-header">
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flex: 1, flexWrap: 'wrap' }}>
          <div className="detail-avatar">{data.ism[0].toUpperCase()}</div>
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

      {jami_qarz > 0 && (
        <div className="eslatma-card">
          <h3>📤 Qarz eslatmasi yuborish</h3>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
            Quyidagi tugmalardan birini bosib, tayyor xabarni yuboring
          </p>
          <div className="eslatma-buttons">
            <a href={`tel:${data.telefon}`} className="eslatma-btn eslatma-phone">
              📞 Qo'ng'iroq
            </a>
            {data.telegram && (
              <a href={`https://t.me/${data.telegram.startsWith('+') ? data.telegram : data.telegram.replace('@','')}`}
                target="_blank" rel="noreferrer" className="eslatma-btn eslatma-telegram">
                ✈️ Telegram
              </a>
            )}
            {data.whatsapp && (
              <a href={`https://wa.me/${data.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(eslatmaText)}`}
                target="_blank" rel="noreferrer" className="eslatma-btn eslatma-whatsapp">
                💬 WhatsApp
              </a>
            )}
            {data.instagram && (
              <a href={`https://instagram.com/${data.instagram.replace('@','')}`}
                target="_blank" rel="noreferrer" className="eslatma-btn eslatma-instagram">
                📸 Instagram
              </a>
            )}
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, fontSize: 12, color: 'var(--text2)', borderLeft: '3px solid var(--accent)' }}>
            <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>📋 Tayyor xabar (nusxa oling):</strong>
            <span style={{ userSelect: 'all' }}>{eslatmaText}</span>
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
                <div className="qarz-item-sabab">{qarz.sabab || "Sabab ko'rsatilmagan"}</div>
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
              </div>
              <div className="qarz-item-amount">
                <div className="qarz-item-total amount-red">{formatSum(qarz.qolgan_summa)} {qarz.valyuta}</div>
                {Number(qarz.summa) !== Number(qarz.qolgan_summa) && (
                  <div className="qarz-item-paid">
                    Jami: {formatSum(qarz.summa)} | To'langan: {formatSum(Number(qarz.summa) - Number(qarz.qolgan_summa))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-success btn-sm" onClick={() => setShowTolovModal(qarz)}>
                  ✅ To'lov
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
                <div className="qarz-item-sabab">{qarz.sabab || "Sabab ko'rsatilmagan"}</div>
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
    </div>
  );
}
