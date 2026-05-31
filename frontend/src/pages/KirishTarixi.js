import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function KirishTarixi() {
  const [tarix, setTarix] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/admin/kirish-tarixi').then(r => setTarix(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🔐 Kirish tarixi</h2>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Tizimga kirish va chiqishlar ro'yxati</p>
      </div>

      <div className="table-card">
        {tarix.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
            <p>Kirish tarixi yo'q</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Foydalanuvchi</th>
                <th>IP manzil</th>
                <th>Holat</th>
                <th>Qurilma</th>
                <th>Sana</th>
              </tr>
            </thead>
            <tbody>
              {tarix.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.username}</td>
                  <td>
                    <code style={{ background: 'var(--bg)', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>
                      {t.ip_manzil}
                    </code>
                  </td>
                  <td>
                    <span className={`badge ${t.status === 'muvaffaqiyatli' ? 'badge-green' : 'badge-red'}`}>
                      {t.status === 'muvaffaqiyatli' ? '✅ Muvaffaqiyatli' : '❌ Muvaffaqiyatsiz'}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.user_agent?.split('(')[0] || '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {new Date(t.created_at).toLocaleString('uz-UZ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}