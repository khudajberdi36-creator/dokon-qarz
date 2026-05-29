const { Pool } = require('pg');

// ✅ Supabase yoki oddiy PostgreSQL ishlaydi
// Supabase: Settings -> Database -> Connection string -> URI ni DATABASE_URL ga qo'ying
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const db = {
  query: (text, params) => pool.query(text, params),

  get_p: async (text, params = []) => {
    const res = await pool.query(text, params);
    return res.rows[0] || null;
  },

  all_p: async (text, params = []) => {
    const res = await pool.query(text, params);
    return res.rows;
  },

  run_p: async (text, params = []) => {
    const res = await pool.query(text, params);
    return { lastID: res.rows[0]?.id, changes: res.rowCount, rows: res.rows };
  }
};

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      dokon_nomi TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS qarzdorlar (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      ism TEXT NOT NULL,
      familiya TEXT,
      telefon TEXT NOT NULL,
      telegram TEXT,
      instagram TEXT,
      whatsapp TEXT,
      manzil TEXT,
      izoh TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS qarzlar (
      id SERIAL PRIMARY KEY,
      qarzdor_id INTEGER NOT NULL REFERENCES qarzdorlar(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      summa NUMERIC NOT NULL,
      valyuta TEXT DEFAULT 'UZS',
      sana DATE NOT NULL,
      muddat DATE,
      sabab TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tolovlar (
      id SERIAL PRIMARY KEY,
      qarz_id INTEGER NOT NULL REFERENCES qarzlar(id) ON DELETE CASCADE,
      summa NUMERIC NOT NULL,
      sana DATE NOT NULL,
      izoh TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // role ustunini qo'shish (eski DB lar uchun)
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
  `).catch(() => {});

  console.log('✅ Database tayyor');

  // Boshlang'ich foydalanuvchilarni yaratish
  await seedUsers();
}

async function seedUsers() {
  const bcrypt = require('bcryptjs');

  const defaultUsers = [
    {
      username: process.env.USER1_LOGIN || 'begzod',
      password: process.env.USER1_PASSWORD || 'begzod777@gmail.com',
      full_name: process.env.USER1_NAME || 'Begzod',
      dokon_nomi: process.env.USER1_DOKON || 'Mega Market',
      role: 'user'
    },
    {
      username: process.env.ADMIN_LOGIN || 'admin',
      password: process.env.ADMIN_PASSWORD || 'begzod777.08',
      full_name: 'Admin',
      dokon_nomi: 'Boshqaruv',
      role: 'admin'
    }
  ];

  for (const u of defaultUsers) {
    const exists = await db.get_p('SELECT id FROM users WHERE username = $1', [u.username]);
    if (!exists) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.query(
        'INSERT INTO users (username, password, full_name, dokon_nomi, role) VALUES ($1,$2,$3,$4,$5)',
        [u.username, hash, u.full_name, u.dokon_nomi, u.role]
      );
      console.log(`✅ Foydalanuvchi yaratildi: ${u.username}`);
    } else {
      // Mavjud foydalanuvchi parolini tekshirish - agar hali hash bo'lmagan bo'lsa hash qilish
      const user = await db.get_p('SELECT password FROM users WHERE username = $1', [u.username]);
      const isHashed = user.password.startsWith('$2');
      if (!isHashed) {
        const hash = await bcrypt.hash(user.password, 10);
        await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hash, u.username]);
        console.log(`🔐 Parol xavfsiz qilindi: ${u.username}`);
      }
    }
  }
}

initDB().catch(err => console.error('DB xato:', err));

module.exports = db;