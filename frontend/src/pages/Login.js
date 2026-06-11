import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // OTP bosqich
  const [step, setStep] = useState('login'); // 'login' | 'otp'
  const [otpPhone, setOtpPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(300); // 5 daqiqa
  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (step === 'otp') {
      setOtpTimer(300);
      timerRef.current = setInterval(() => {
        setOtpTimer(t => {
          if (t <= 1) { clearInterval(timerRef.current); return 0; }
          return t - 1;
        });
      }, 1000);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
    return () => clearInterval(timerRef.current);
  }, [step]);

  const formatTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', form);
      if (res.data.otp_required) {
        setOtpPhone(res.data.phone);
        setStep('otp');
      } else {
        // OTP yo'q — to'g'ri kirish
        localStorage.setItem('token', res.data.token);
        window.location.href = res.data.user.role === 'admin' ? '/admin' : '/';
      }
    } catch (err) {
      setError(err.response?.data?.error || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[i] = val.slice(-1);
    setOtp(newOtp);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
    // Avtomatik tekshirish
    const full = newOtp.join('');
    if (full.length === 6) handleVerifyOtp(full);
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (code) => {
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/verify-otp', {
        username: form.username,
        code: code || otp.join('')
      });
      localStorage.setItem('token', res.data.token);
      window.location.href = res.data.user.role === 'admin' ? '/admin' : '/';
    } catch (err) {
      setError(err.response?.data?.error || "Kod noto'g'ri");
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', form);
      if (res.data.otp_required) {
        setOtpPhone(res.data.phone);
        setStep('otp');
      }
    } catch (err) {
      setError(err.response?.data?.error || "Xatolik");
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    width: '100%', maxWidth: 400,
  };

  const iconBox = {
    width: 72, height: 72, borderRadius: 20,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32, margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(99,102,241,0.35)'
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 16 }}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={iconBox}>🏪</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Do'kon Qarz</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Qarzlarni oson va qulay boshqaring</p>
        </div>

        <div className="table-card" style={{ padding: 28 }}>

          {/* ===== LOGIN BOSQICH ===== */}
          {step === 'login' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: 'center' }}>🔐 Tizimga kirish</h2>

              {sessionExpired && (
                <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#f59e0b', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  ⏰ Sessiya muddati tugadi. Qayta kiring.
                </div>
              )}

              {error && <div className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">FOYDALANUVCHI NOMI</label>
                  <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                    className="form-input" placeholder="username" required autoComplete="username" autoFocus />
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">PAROL</label>
                  <input type={showPass ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="form-input" placeholder="••••••••" required autoComplete="current-password"
                    style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: 12, bottom: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 16 }}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>

                <button type="submit" className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '13px', marginTop: 8, fontSize: 15 }}
                  disabled={loading}>
                  {loading ? <span className="spinner" /> : '🔑 Kirish'}
                </button>
              </form>
            </>
          )}

          {/* ===== OTP BOSQICH ===== */}
          {step === 'otp' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>SMS Kod</h2>
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                  <strong>{otpPhone}</strong> raqamiga 6 xonali kod yuborildi
                </p>
              </div>

              {error && <div className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

              {/* OTP kiritish */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
                {otp.map((val, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text" inputMode="numeric" maxLength={1}
                    value={val}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    style={{
                      width: 44, height: 52, textAlign: 'center',
                      fontSize: 22, fontWeight: 700, borderRadius: 10,
                      border: `2px solid ${val ? '#6366f1' : 'var(--border)'}`,
                      background: 'var(--bg2)', color: 'var(--text)',
                      outline: 'none', transition: 'border-color 0.2s'
                    }}
                  />
                ))}
              </div>

              {/* Tasdiqlash tugmasi */}
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, marginBottom: 16 }}
                onClick={() => handleVerifyOtp()}
                disabled={loading || otp.join('').length < 6}
              >
                {loading ? <span className="spinner" /> : '✅ Tasdiqlash'}
              </button>

              {/* Taymer va qayta yuborish */}
              <div style={{ textAlign: 'center' }}>
                {otpTimer > 0 ? (
                  <p style={{ color: 'var(--text3)', fontSize: 13 }}>
                    Kod muddati: <strong style={{ color: otpTimer < 60 ? '#ef4444' : '#6366f1' }}>{formatTimer(otpTimer)}</strong>
                  </p>
                ) : (
                  <button onClick={handleResend} disabled={loading}
                    style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                    🔄 Kodni qayta yuborish
                  </button>
                )}
              </div>

              {/* Orqaga */}
              <button onClick={() => { setStep('login'); setError(''); setOtp(['','','','','','']); }}
                style={{ display: 'block', width: '100%', marginTop: 12, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13 }}>
                ← Orqaga qaytish
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 16 }}>
          🔒 Barcha ma'lumotlar faqat sizga ko'rinadi
        </p>
      </div>
    </div>
  );
}