import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const icons = {
  dashboard: '📊',
  people: '👥',
  warning: '⏰',
  logout: '🚪',
  menu: '☰',
  store: '🏪',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    axios.get('/api/qarzlar/muddati-otgan').then(r => setOverdueCount(r.data.length)).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: '#00000060', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">🏪</div>
          <h2>{user?.dokon_nomi || "Do'konim"}</h2>
          <p>Qarz boshqaruv tizimi</p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Asosiy</div>
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <span>📊</span> Dashboard
          </NavLink>
          <NavLink to="/qarzdorlar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <span>👥</span> Qarzdorlar
          </NavLink>
          <NavLink to="/muddati-otgan" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <span>⏰</span> Muddati o'tgan
            {overdueCount > 0 && <span className="badge">{overdueCount}</span>}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">
              {(user?.full_name || user?.username || 'A')[0].toUpperCase()}
            </div>
            <div className="user-card-info">
              <h4>{user?.full_name || user?.username}</h4>
              <p>Do'kon egasi</p>
            </div>
          </div>
          <button className="nav-item" style={{ marginTop: 8, color: 'var(--red)' }} onClick={handleLogout}>
            <span>🚪</span> Chiqish
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="topbar-title">
            <h1>{user?.dokon_nomi || "Do'kon Qarz"}</h1>
            <p>Salom, {user?.full_name}! 👋</p>
          </div>
          <div className="topbar-actions">
            <button
              className="btn btn-secondary"
              style={{ display: 'none' }}
              id="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
          </div>
        </div>

        <div className="page-content">
          <Outlet />
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          #sidebar-toggle { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
