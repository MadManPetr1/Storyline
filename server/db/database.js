const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ensure the db directory exists
const fs = require('fs');
const dbDir = path.join(__dirname, '.');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

const db = new sqlite3.Database(path.join(dbDir, 'database.sqlite'));

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

  // Auto-insert a blank default story if no story exists
  db.get("SELECT COUNT(*) as cnt FROM stories", (err, row) => {
    if (!err && row.cnt === 0) {
      db.run("INSERT INTO stories (name) VALUES (?)", [""], (err) => {
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