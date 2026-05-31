import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Kunlarga bo'lish helper
function groupByDay(list) {
  const groups = {};
  list.forEach(t => {
    const day = new Date(t.created_at).toLocaleDateString('uz-UZ', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });
    if (!groups[day]) groups[day] = [];
    groups[day].push(t);
  });
  return groups;
}

// IP → shahar/mamlakat (faqat frontend, bepul api)
async function fetchLocation(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
    return 'Lokal tarmoq';
  }
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`);
    const d = await r.json();
    if (d.city && d.country_name) return `${d.city}, ${d.country_name}`;
    if (d.country_name) return d.country_name;
    return '—';
  } catch {
    return '—';
  }
}

// User-Agent → qurilma nomi
function parseDevice(ua) {
  if (!ua) return { icon: '❓', name: 'Noma\'lum' };
  const s = ua.toLowerCase();
  if (s.includes('android')) return { icon: '📱', name: 'Android' };
  if (s.includes('iphone') || s.includes('ipad')) return { icon: '🍎', name: 'iPhone/iPad' };
  if (s.includes('windows')) return { icon: '🖥️', name: 'Windows' };
  if (s.includes('macintosh') || s.includes('mac os')) return { icon: '💻', name: 'Mac' };
  if (s.includes('linux')) return { icon: '🐧', name: 'Linux' };
  return { icon: '🌐', name: 'Boshqa' };
}

// Browser nomi
function parseBrowser(ua) {
  if (!ua) return '—';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Boshqa';
}

export default function KirishTarixi() {
  const [tarix, setTarix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState({});
  const [filter, setFilter] = useState('barchasi'); // barchasi | muvaffaqiyatli | xato
  const [search, setSearch] = useState('');
  const [openDays, setOpenDays] = useState({});

  useEffect(() => {
    axios.get('/api/admin/kirish-tarixi')
      .then(r => {
        setTarix(r.data);
        // Birinchi 20 ta IP uchun lokatsiya olish
        const uniqIPs = [...new Set(r.data.slice(0, 20).map(t => t.ip_manzil))];
        uniqIPs.forEach(async ip => {
          const loc = await fetchLocation(ip);
          setLocations(prev => ({ ...prev, [ip]: loc }));
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  // Filter
  const filtered = tarix.filter(t => {
    const matchFilter =
      filter === 'barchasi' ||
      (filter === 'muvaffaqiyatli' && t.status === 'muvaffaqiyatli') ||
      (filter === 'xato' && t.status !== 'muvaffaqiyatli');
    const matchSearch =
      !search ||
      t.username?.toLowerCase().includes(search.toLowerCase()) ||
      t.ip_manzil?.includes(search);
    return matchFilter && matchSearch;
  });

  const grouped = groupByDay(filtered);
  const days = Object.keys(grouped);

  // Statistika
  const total = tarix.length;
  const muvaffaq = tarix.filter(t => t.status === 'muvaffaqiyatli').length;
  const xato = total - muvaffaq;
  const uniqIP = new Set(tarix.map(t => t.ip_manzil)).size;

  const toggleDay = (day) => {
    setOpenDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  // Birinchi kun ochiq bo'lsin
  const isDayOpen = (day) => {
    if (openDays[day] !== undefined) return openDays[day];
    return days.indexOf(day) === 0; // faqat birinchi kun ochiq
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          🛡️ Kirish tarixi
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>
          Tizimga kirish va chiqishlar — kunlarga bo'lingan ro'yxat
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
        <div className="stat-card purple" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 22 }}>📋</div>
          <div className="stat-label" style={{ marginTop: 8 }}>Jami urinish</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{total}</div>
        </div>
        <div className="stat-card green" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 22 }}>✅</div>
          <div className="stat-label" style={{ marginTop: 8 }}>Muvaffaqiyatli</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{muvaffaq}</div>
        </div>
        <div className="stat-card red" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 22 }}>🚫</div>
          <div className="stat-label" style={{ marginTop: 8 }}>Xato urinish</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{xato}</div>
        </div>
        <div className="stat-card orange" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 22 }}>🌍</div>
          <div className="stat-label" style={{ marginTop: 8 }}>Turli IP</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{uniqIP}</div>
        </div>
      </div>

      {/* Filter + Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, gap: 4 }}>
          {[
            { key: 'barchasi', label: '🗂️ Barchasi' },
            { key: 'muvaffaqiyatli', label: '✅ Muvaffaqiyatli' },
            { key: 'xato', label: '🚫 Xato' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                background: filter === f.key ? 'var(--accent)' : 'transparent',
                color: filter === f.key ? 'white' : 'var(--text2)',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          className="form-input"
          placeholder="🔍 Username yoki IP qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 240, padding: '9px 14px', fontSize: 13 }}
        />

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)' }}>
          {filtered.length} ta yozuv
        </span>
      </div>

      {/* Kunlarga bo'lingan ro'yxat */}
      {days.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text2)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p>Hech narsa topilmadi</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {days.map(day => {
            const dayItems = grouped[day];
            const isOpen = isDayOpen(day);
            const dayXato = dayItems.filter(t => t.status !== 'muvaffaqiyatli').length;

            return (
              <div key={day} className="table-card" style={{ overflow: 'hidden' }}>
                {/* Kun sarlavhasi — bosiladi */}
                <button
                  onClick={() => toggleDay(day)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 20px', background: 'none', border: 'none',
                    borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', transition: 'background 0.15s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ fontSize: 18 }}>📅</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', flex: 1, textAlign: 'left' }}>
                    {day}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text3)', marginRight: 8 }}>
                    {dayItems.length} ta kirish
                  </span>
                  {dayXato > 0 && (
                    <span className="badge badge-red" style={{ marginRight: 8 }}>
                      ⚠️ {dayXato} xato
                    </span>
                  )}
                  <span style={{ fontSize: 16, color: 'var(--text3)', transition: 'transform 0.25s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▼
                  </span>
                </button>

                {/* Jadval */}
                {isOpen && (
                  <table>
                    <thead>
                      <tr>
                        <th>👤 Foydalanuvchi</th>
                        <th>🌐 IP manzil</th>
                        <th>📍 Lokatsiya</th>
                        <th>💻 Qurilma</th>
                        <th>🌍 Brauzer</th>
                        <th>📊 Holat</th>
                        <th>🕐 Vaqt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayItems.map(t => {
                        const device = parseDevice(t.user_agent);
                        const browser = parseBrowser(t.user_agent);
                        const loc = locations[t.ip_manzil];

                        return (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 600 }}>
                              <span style={{ fontSize: 14 }}>👤</span>{' '}
                              {t.username}
                            </td>
                            <td>
                              <code style={{
                                background: 'var(--bg)', padding: '3px 8px',
                                borderRadius: 6, fontSize: 12, letterSpacing: '0.02em'
                              }}>
                                {t.ip_manzil}
                              </code>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text2)', minWidth: 140 }}>
                              {loc === undefined ? (
                                <span style={{ color: 'var(--text3)', fontSize: 11 }}>⏳ aniqlanmoqda...</span>
                              ) : (
                                <span>📍 {loc}</span>
                              )}
                            </td>
                            <td style={{ fontSize: 12 }}>
                              <span>{device.icon} {device.name}</span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                              🌍 {browser}
                            </td>
                            <td>
                              <span className={`badge ${t.status === 'muvaffaqiyatli' ? 'badge-green' : t.status === 'bloklangan' ? 'badge-orange' : 'badge-red'}`}>
                                {t.status === 'muvaffaqiyatli' ? '✅ OK' : t.status === 'bloklangan' ? '🔒 Bloklangan' : '🚫 Xato'}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                              🕐 {new Date(t.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}