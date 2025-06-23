// server/routes/admin.js

const express = require('express');
const db = require('../db/database');
const jwt = require('jsonwebtoken');
const router = express.Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET;

// --- JWT Auth Middleware ---
function verifyAdmin(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const decoded = jwt.verify(token, ADMIN_SECRET);
    if (!decoded || !decoded.admin) throw new Error();
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// --- AUTH: Login ---
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = jwt.sign({ admin: true }, ADMIN_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// --- LINES: CRUD and Stats ---

// List all lines
router.get('/lines', verifyAdmin, (req, res) => {
  db.all(
    "SELECT id, username, color, text, created_at FROM lines ORDER BY created_at DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ lines: rows });
    }
  );
});

// Delete a line
router.delete('/line/:id', verifyAdmin, (req, res) => {
  const lineId = req.params.id;
  db.run("DELETE FROM lines WHERE id = ?", [lineId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Line not found' });
    res.json({ success: true });
  });
});

// Get basic stats
router.get('/stats', verifyAdmin, (req, res) => {
  db.get("SELECT COUNT(*) AS lines FROM lines", [], (err, linesRow) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get("SELECT COUNT(DISTINCT username) AS contributors FROM lines", [], (err, usersRow) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ lines: linesRow.lines, contributors: usersRow.contributors });
    });
  });
});

// --- FLAGS: Review & Moderation ---

// List all flags (joined with lines)
router.get('/flags', verifyAdmin, (req, res) => {
  db.all(`
    SELECT f.id, f.line_id, f.reason, f.flagged_by, f.flagged_at, f.resolved,
           l.text, l.username, l.color
    FROM line_flags f
    LEFT JOIN lines l ON f.line_id = l.id
    ORDER BY f.flagged_at DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ flags: rows });
  });
});

// Resolve a flag
router.post('/flag/:id/resolve', verifyAdmin, (req, res) => {
  const id = req.params.id;
  db.run("UPDATE line_flags SET resolved = 1 WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- LOGS: Admin Action Logging ---

router.post('/log', verifyAdmin, (req, res) => {
  const { action, target, admin_id } = req.body;
  db.run(
    "INSERT INTO admin_logs (action, target, admin_id) VALUES (?, ?, ?)",
    [action, target, admin_id || 'unknown'],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// --- DB/TOOLS: Download and Raw View ---

// Download the full database (admin-only)
router.get('/download-db', verifyAdmin, (req, res) => {
  const dbPath = process.env.DB_PATH || '/data/database.sqlite';
  res.download(dbPath, 'database.sqlite');
});

// View all raw flags as JSON (admin-only)
router.get('/debug-flags', verifyAdmin, (req, res) => {
  db.all('SELECT * FROM line_flags ORDER BY flagged_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;