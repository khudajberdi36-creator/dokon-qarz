import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: '🏠 Dashboard', exact: true },
    { to: '/qarzdorlar', label: '👥 Qarzdorlar' },
    { to: '/muddati-otgan', label: '⏰ Muddati o\'tgan' },
    { to: '/mahsulotlar', label: '📦 Mahsulotlar' },
    ...(user?.role === 'admin' ? [
      { to: '/admin', label: '👑 Admin' },
      { to: '/kirish-tarixi', label: '🔐 Kirish tarixi' },
    ] : []),
  ];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">🏪 Do'kon Qarz</div>
          <div className="user-info">
            <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.full_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{user?.dokon_nomi}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleLogout}>
            🚪 Chiqish
          </button>
        </div>
      </aside>

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}

      {/* Main */}
      <main className="main-content">
        <div className="topbar">
          <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>@{user?.username}</span>
            {user?.role === 'admin' && <span className="badge badge-red">👑 Admin</span>}
          </div>
        </div>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}