const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// Determine database file path
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');
const dbDir = path.dirname(dbPath);

// Ensure the data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else {
    console.log(`📦 SQLite database connected at: ${dbPath}`);
  }
});

// Initialize database schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      course TEXT NOT NULL,
      timing TEXT,
      message TEXT,
      status TEXT DEFAULT 'New',
      source TEXT DEFAULT 'Website Enquiry',
      counsellor_notes TEXT
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating enquiries table:', err.message);
    } else {
      console.log('✅ Enquiries table ready.');
    }
  });

  // Indexes for query performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries(created_at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_enquiries_mobile ON enquiries(mobile)`);
});

// Promise-based helpers for async/await in Express controllers
db.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

db.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

db.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

module.exports = db;
