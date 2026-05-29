import React, { useState } from 'react';

// Raqamni formatlash: 1000000 => "1 000 000"
export function formatSum(n) {
  if (!n && n !== 0) return '';
  return Number(n).toLocaleString('uz-UZ');
}

// Input component: ko'rsatish uchun formatlangan, saqlash uchun raqam
export default function SummaInput({ value, onChange, placeholder = "0", required, className }) {
  const [display, setDisplay] = useState(value ? Number(value).toLocaleString('uz-UZ') : '');

  const handleChange = (e) => {
    // Faqat raqamlar qolsin
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw ? Number(raw) : '';
    // Ko'rsatish uchun formatlash
    setDisplay(raw ? Number(raw).toLocaleString('uz-UZ') : '');
    // Parent ga raqam berish
    onChange(num);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      className={className || 'form-input'}
      style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.02em' }}
    />
  );
}
