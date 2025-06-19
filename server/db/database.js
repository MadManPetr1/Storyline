const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/database.sqlite');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      archived_at DATETIME
    )
  `);

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
});

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

module.exports = db;