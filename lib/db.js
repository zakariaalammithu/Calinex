const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const defaultEmail = (process.env.ADMIN_EMAIL || 'hello@calinex.us').toLowerCase();
const defaultPassword = process.env.ADMIN_PASSWORD || 'Calinexusa123';
const defaultSalt = 'calinex_salt_secure_2026';
const defaultHash = crypto.scryptSync(defaultPassword, defaultSalt, 64).toString('hex');

class FailSafeDatabaseSync {
  constructor(filePath) {
    this.filePath = filePath;
    this.inMemoryUsers = [{
      id: 1,
      name: 'MD Sharafat Ullah',
      email: defaultEmail,
      password_hash: defaultHash,
      salt: defaultSalt,
      role_id: 1,
      role_name: 'Super Admin',
      role_permissions: JSON.stringify(['*']),
      status: 'active'
    }];
  }
  exec(sql) { return this; }
  prepare(sql) {
    const self = this;
    const lowerSql = (sql || '').toLowerCase();
    return {
      run: (...args) => ({ changes: 1, lastInsertRowid: Date.now() }),
      get: (...args) => {
        if (lowerSql.includes('from users')) {
          const requestedEmail = (args[0] || '').toString().toLowerCase();
          if (!requestedEmail || requestedEmail === defaultEmail || requestedEmail === 'admin@calinex.us') {
            return self.inMemoryUsers[0];
          }
        }
        if (lowerSql.includes('count(*)')) return { c: 1, count: 1 };
        if (lowerSql.includes('coalesce(sum')) return { s: 0 };
        return null;
      },
      all: (...args) => []
    };
  }
}

let DatabaseSyncClass;
try {
  const modName = 'node:sqlite';
  const nativeModule = require(modName);
  if (nativeModule && nativeModule.DatabaseSync) {
    DatabaseSyncClass = nativeModule.DatabaseSync;
  } else {
    DatabaseSyncClass = FailSafeDatabaseSync;
  }
} catch (err) {
  console.warn('[DB NOTICE] Native node:sqlite module unavailable, utilizing fail-safe in-memory DB:', err.message);
  DatabaseSyncClass = FailSafeDatabaseSync;
}

const dataDir = process.env.VERCEL
  ? '/tmp'
  : (process.env.DATA_DIR || path.join(__dirname, '..', 'data'));

const DB_PATH = path.join(dataDir, 'calinex.sqlite');

try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (e) {}

let db;
try {
  db = new DatabaseSyncClass(DB_PATH);
  if (!process.env.VERCEL) {
    try { db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`); } catch(e) {}
  } else {
    try { db.exec(`PRAGMA foreign_keys = ON;`); } catch(e) {}
  }
} catch (err) {
  console.warn('[DB NOTICE] DB instantiation failed, using FailSafeDatabaseSync:', err.message);
  db = new FailSafeDatabaseSync(DB_PATH);
}

function initSchema() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        permissions TEXT NOT NULL,
        is_system INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role_id INTEGER REFERENCES roles(id),
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        token TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        resource TEXT,
        ip_address TEXT,
        user_agent TEXT,
        details TEXT,
        status TEXT DEFAULT 'success',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const userCount = db.prepare('SELECT count(*) as count FROM users').get();
    if (!userCount || userCount.count === 0) {
      db.prepare(`
        INSERT INTO users (name, email, password_hash, salt, role_id, status)
        VALUES (?, ?, ?, ?, 1, 'active')
      `).run('MD Sharafat Ullah', defaultEmail, defaultHash, defaultSalt);
    }
  } catch (e) {
    console.warn('[DB SCHEMA NOTICE]', e.message);
  }
}

try {
  initSchema();
} catch (e) {}

module.exports = {
  db,
  initSchema,
  DatabaseSync: DatabaseSyncClass
};
