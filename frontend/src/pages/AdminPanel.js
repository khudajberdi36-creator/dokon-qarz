import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatSum } from '../components/SummaInput';

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [qarzdorlar, setQarzdorlar] = useState([]);
  const [tab, setTab] = useState('stats');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, q] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/qarzdorlar')
      ]);
      setStats(s.data);
      setQarzdorlar(q.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUserData = async (userId, username) => {
    try {
      await axios.delete(`/api/admin/user/${userId}/data`);
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.error || err.message));
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  const jami_qarz_barchasi = stats.reduce((s, u) => s + u.qolgan_qarz, 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 20 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 2 }}>⚙️ Admin Panel</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Barcha foydalanuvchilarni boshqarish</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            🏪 Do'kon
          </button>
          <button className="btn btn-danger" onClick={handleLogout}>
            🚪 Chiqish
          </button>
        </div>
      </div>

      {/* Umumiy stat */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card purple">
          <div className="stat-icon">👥</div>
          <div className="stat-label">Jami foydalanuvchilar</div>
          <div className="stat-value">{stats.length}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">💸</div>
          <div className="stat-label">Umumiy qolgan qarz</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{formatSum(jami_qarz_barchasi)}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">📋</div>
          <div className="stat-label">Jami qarzdorlar</div>
          <div className="stat-value">{stats.reduce((s, u) => s + u.jami_qarzdorlar, 0)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className={`btn ${tab === 'stats' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('stats')}
        >👤 Foydalanuvchilar</button>
        <button
          className={`btn ${tab === 'qarzdorlar' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('qarzdorlar')}
        >📋 Barcha qarzdorlar</button>
      </div>

      {/* Foydalanuvchilar */}
      {tab === 'stats' && (
        <div className="table-card">
          <div className="table-header">
            <h3>👤 Foydalanuvchilar ro'yxati</h3>
          </div>
          {stats.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 40 }}>👤</div>
              <h3>Foydalanuvchilar yo'q</h3>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Foydalanuvchi</th>
                  <th>Do'kon</th>
                  <th>Qarzdorlar</th>
                  <th>Jami qarz</th>
                  <th>Qolgan qarz</th>
                  <th>Harakatlar</th>
                </tr>
              </thead>
              <tbody>
                {stats.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>@{u.username}</div>
                    </td>
                    <td>{u.dokon_nomi}</td>
                    <td><span className="badge badge-blue">{u.jami_qarzdorlar} ta</span></td>
                    <td><span className="amount">{formatSum(u.jami_qarz)} so'm</span></td>
                    <td>
                      <span className={`amount ${u.qolgan_qarz > 0 ? 'amount-red' : 'amount-green'}`}>
                        {formatSum(u.qolgan_qarz)} so'm
                      </span>
                    </td>
                    <td>
                      {deleteConfirm === u.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: 'var(--red)' }}>Ishonchingiz komilmi?</span>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUserData(u.id, u.username)}>
                            Ha
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirm(null)}>
                            Yo'q
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(u.id)}>
                          🗑️ Ma'lumotlarni o'chir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Barcha qarzdorlar */}
      {tab === 'qarzdorlar' && (
        <div className="table-card">
          <div className="table-header">
            <h3>📋 Barcha qarzdorlar ({qarzdorlar.length} ta)</h3>
          </div>
          {qarzdorlar.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 40 }}>📋</div>
              <h3>Qarzdorlar yo'q</h3>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Qarzdor</th>
                  <th>Telefon</th>
                  <th>Do'kon</th>
                  <th>Qolgan qarz</th>
                </tr>
              </thead>
              <tbody>
                {qarzdorlar.map((q, i) => (
                  <tr key={q.id}>
                    <td style={{ color: 'var(--text3)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{q.ism} {q.familiya}</td>
                    <td>{q.telefon}</td>
                    <td>
                      <span className="badge badge-blue">{q.dokon_nomi}</span>
                    </td>
                    <td>
                      <span className={`amount ${q.jami_qarz > 0 ? 'amount-red' : 'amount-green'}`}>
                        {formatSum(q.jami_qarz)} so'm
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
