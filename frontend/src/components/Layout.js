import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

const getNavItems = (role) => [
  { to: '/',               label: 'Dashboard',        icon: '🗂️', exact: true },
  { to: '/qarzdorlar',     label: 'Qarzdorlar',        icon: '🧾' },
  { to: '/muddati-otgan',  label: "Muddati o'tgan",   icon: '⚠️' },
  { to: '/mahsulotlar',    label: 'Mahsulotlar',       icon: '🛒' },
  ...(role === 'admin' ? [
    { to: '/admin',          label: 'Admin',            icon: '👑', isAdmin: true },
    { to: '/kirish-tarixi',  label: 'Kirish tarixi',   icon: '🛡️' },
  ] : []),
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ripples, setRipples] = useState({});

  const handleLogout = () => { logout(); navigate('/login'); };
  const items = getNavItems(user?.role);

  const handleNavClick = (to, e) => {
    setSidebarOpen(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const rpl = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() };
    setRipples(prev => ({ ...prev, [to]: rpl }));
    setTimeout(() => setRipples(prev => { const n = { ...prev }; delete n[to]; return n; }), 600);
  };

  return (
    <div className="app-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-icon">🏪</div>
          <div className="brand-text">
            <span className="brand-name">Do'kon Qarz</span>
            <span className="brand-sub">Boshqaruv tizimi</span>
          </div>
        </div>

        {/* User card */}
        <div className="sidebar-user">
          <Avatar name={user?.full_name} size={34} radius={9} fontSize={13} />
          <div className="user-info-sidebar">
            <span className="user-name-sidebar">{user?.full_name}</span>
            <span className="user-shop-sidebar">{user?.dokon_nomi}</span>
          </div>
          {user?.role === 'admin' && <span style={{ fontSize: 14 }} title="Admin">👑</span>}
        </div>

        <div className="sidebar-divider" />

        {/* Nav */}
        <nav className="sidebar-nav">
          <span className="nav-section-label">Menyu</span>
          {items.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            const ripple = ripples[item.to];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={`nav-btn ${isActive ? 'nav-btn--active' : ''} ${item.isAdmin ? 'nav-btn--admin' : ''}`}
                onClick={(e) => handleNavClick(item.to, e)}
              >
                <span className="nav-btn-icon">{item.icon}</span>
                <span className="nav-btn-label">{item.label}</span>
                {isActive && <span className="nav-btn-dot" />}
                {ripple && (
                  <span key={ripple.id} className="nav-ripple"
                    style={{ left: ripple.x, top: ripple.y }} />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-divider" />
          <button className="logout-btn" onClick={handleLogout}>
            <span>🚪</span><span>Chiqish</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Menyu"
          >
            <span className={`hamburger-line ${sidebarOpen ? 'hamburger-line--top-open' : ''}`} />
            <span className={`hamburger-line ${sidebarOpen ? 'hamburger-line--mid-hide' : ''}`} />
            <span className={`hamburger-line ${sidebarOpen ? 'hamburger-line--bot-open' : ''}`} />
          </button>
          <div className="topbar-right">
            <span className="topbar-username">@{user?.username}</span>
            {user?.role === 'admin' && <span className="badge badge-red">👑 Admin</span>}
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}