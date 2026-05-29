# 🏪 Dokon-Qarz — Deploy Qo'llanmasi

## Loyiha tuzilmasi
```
dokon-qarz/
├── backend/     → Render.com ga deploy
└── frontend/    → Vercel ga deploy
```

---

## 1️⃣ BACKEND — Render.com ga deploy

### Qadamlar:
1. `backend/` papkasini GitHub repoga yuklang
2. https://render.com ga kiring → **New Web Service**
3. GitHub reponi ulang
4. **Environment Variables** bo'limiga quyidagilarni kiriting:

| Variable | Qiymat |
|----------|--------|
| `DATABASE_URL` | `postgresql://postgres:PAROL@db.XXXX.supabase.co:5432/postgres` |
| `JWT_SECRET` | O'zingiz ixtiyoriy maxfiy kalit kiriting |
| `RESET_SECRET` | O'zingiz ixtiyoriy maxfiy kalit kiriting |
| `NODE_ENV` | `production` |
| `USER1_LOGIN` | masalan: `begzod` |
| `USER1_PASSWORD` | foydalanuvchi paroli |
| `USER1_NAME` | masalan: `Begzod` |
| `USER1_DOKON` | masalan: `Mega Market` |
| `ADMIN_LOGIN` | masalan: `admin` |
| `ADMIN_PASSWORD` | admin paroli |

5. Deploy bo'lgach, backend URL ni copy qiling (masalan: `https://dokon-qarz.onrender.com`)

---

## 2️⃣ FRONTEND — Vercel ga deploy

### Qadamlar:
1. `frontend/vercel.json` faylini oching
2. `BACKEND_URL_SIZU.onrender.com` ni o'rniga real backend URL ni qo'ying:
   ```json
   { "source": "/api/:path*", "destination": "https://SIZNING-BACKEND.onrender.com/api/:path*" }
   ```
3. `frontend/` papkasini GitHub repoga yuklang (yoki alohida repo)
4. https://vercel.com → **New Project** → reponi ulang
5. **Root Directory** = `frontend` deb belgilang
6. Deploy bosing ✅

---

## ✅ Tekshirish
- Backend ishlayotganini: `https://sizning-backend.onrender.com/` ga kiring → `{"status":"ok"}` ko'rsanggiz ishlayapti
- Supabase jadvallar birinchi ishga tushganda avtomatik yaratiladi
- Birinchi kirishda: `USER1_LOGIN` va `USER1_PASSWORD` bilan kiring

---

## 🔐 Parol reset qilish
```
POST https://sizning-backend.onrender.com/api/auth/reset-password
Body: { "secret": "RESET_SECRET qiymati", "username": "begzod", "new_password": "yangiparol" }
```
