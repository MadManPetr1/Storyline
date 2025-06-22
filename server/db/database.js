const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use environment variable or default to /data/database.sqlite
const dbPath = process.env.DB_PATH || '/data/database.sqlite';

// Ensure the directory for the database exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create/connect the database
const db = new sqlite3.Database(dbPath);

// -- TABLES --
db.serialize(() => {
  // Stories table
  db.run(`
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      archived_at DATETIME
    )
  `);

  // Lines table
  db.run(`
    CREATE TABLE IF NOT EXISTS lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER,
      text TEXT,
      username TEXT,
      color TEXT,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Story renames table for cooldown tracking
  db.run(`
    CREATE TABLE IF NOT EXISTS story_renames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER,
      username TEXT,
      renamed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 🔒 Line flags (moderation)
  db.run(`
    CREATE TABLE IF NOT EXISTS line_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      line_id INTEGER NOT NULL,
      reason TEXT,
      flagged_by TEXT,
      flagged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved BOOLEAN DEFAULT 0
    )
  `);

  // 📝 Admin action logs
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      target TEXT,
      admin_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Auto-insert a blank default story if no story exists
  db.get("SELECT COUNT(*) as cnt FROM stories", (err, row) => {
    if (!err && row.cnt === 0) {
      db.run("INSERT INTO stories (name) VALUES (?)", ["Untitled"], (err) => {
        if (err) {
          console.error("Failed to insert default blank story:", err.message);
        } else {
          console.log("Inserted default blank story.");
        }
      });
    }
  });
});

module.exports = db;