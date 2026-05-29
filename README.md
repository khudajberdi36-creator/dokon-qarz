# 🏪 Do'kon Qarz — Qarzlarni boshqarish tizimi

Do'kon egasi uchun qarzlarni kuzatish, aloqa qilish va eslatma yuborish tizimi.

---

## ✨ Imkoniyatlar

- 🔐 **Login / Ro'yxatdan o'tish** — Har bir do'kon egasi uchun alohida akkaunt
- 👥 **Qarzdorlar** — Ism, telefon, Telegram, Instagram, WhatsApp saqlash
- 💸 **Qarzlar** — Summa, sana, muddat, sabab bilan qo'shish
- ✅ **To'lovlar** — Qisman to'lovlarni kuzatish
- ⏰ **Muddati o'tgan** — Kechikkan qarzlarni alohida ko'rish
- 📤 **Eslatma yuborish** — Bir tugma bilan qo'ng'iroq / TG / WA / IG orqali bog'lanish
- 📊 **Dashboard** — Umumiy statistika

---

## 🚀 O'rnatish

### Backend (Render.com)

```bash
cd backend
npm install
node server.js
```

**Render.com'ga deploy:**
1. GitHub'ga push qiling
2. render.com → New Web Service
3. `backend` papkasini tanlang
4. Build: `npm install` | Start: `node server.js`
5. Environment variable: `JWT_SECRET=istalgan_maxfiy_so'z`

### Frontend (Vercel)

```bash
cd frontend
npm install
npm start
```

**Vercel'ga deploy:**
1. `frontend/vercel.json` ichidagi `YOUR-BACKEND-URL` ni Render URL bilan almashtiring
2. `vercel.com` → New Project → GitHub repo → `frontend` papkasini tanlang
3. Deploy!

---

## 📁 Loyiha tuzilmasi

```
dokon-qarz/
├── backend/
│   ├── server.js
│   ├── database.js        ← SQLite (dokon_qarz.db)
│   ├── middleware/auth.js ← JWT
│   ├── routes/
│   │   ├── auth.js        ← Login/Register
│   │   ├── qarzdorlar.js  ← CRUD
│   │   ├── qarzlar.js     ← Qarz + To'lovlar
│   │   └── stats.js       ← Dashboard statistika
│   ├── package.json
│   └── render.yaml
│
└── frontend/
    ├── public/index.html
    ├── src/
    │   ├── App.js
    │   ├── index.css      ← Pro dark dizayn
    │   ├── context/AuthContext.js
    │   ├── components/Layout.js
    │   └── pages/
    │       ├── Login.js
    │       ├── Dashboard.js
    │       ├── Qarzdorlar.js
    │       ├── QarzdorForm.js
    │       ├── QarzdorDetail.js
    │       └── MuddatiOtgan.js
    ├── package.json
    └── vercel.json
```

---

## 🛠 Texnologiyalar

| | Texnologiya |
|---|---|
| Frontend | React 18, React Router 6, Axios |
| Backend | Node.js, Express.js |
| Database | SQLite (better-sqlite3) |
| Auth | JWT (30 kunlik) |
| Styling | Custom CSS (dark theme) |

---

## 🔗 Aloqa kanallar

Tizim quyidagi kanallar orqali qarz eslatmasi yuborishni qo'llab-quvvatlaydi:

| Kanal | Amal |
|---|---|
| 📞 Telefon | Bevosita qo'ng'iroq |
| ✈️ Telegram | Profilga o'tish |
| 💬 WhatsApp | Tayyor xabar bilan ochish |
| 📸 Instagram | DM sahifasiga o'tish |
