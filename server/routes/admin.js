const express = require('express');
const db = require('../db/database');
const jwt = require('jsonwebtoken');
const router = express.Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET

// Helper: verify token middleware
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

// Admin login: POST /api/admin/login { password }
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  // Create JWT for 12h
  const token = jwt.sign({ admin: true }, ADMIN_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// List lines: GET /api/admin/lines (JWT protected)
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

// Delete line: DELETE /api/admin/line/:id (JWT protected)
router.delete('/line/:id', verifyAdmin, (req, res) => {
  const lineId = req.params.id;
  db.run("DELETE FROM lines WHERE id = ?", [lineId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Line not found' });
    res.json({ success: true });
  });
});

// Stats: GET /api/admin/stats (JWT protected)
router.get('/stats', verifyAdmin, (req, res) => {
  db.get("SELECT COUNT(*) AS lines FROM lines", [], (err, linesRow) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get("SELECT COUNT(DISTINCT username) AS contributors FROM lines", [], (err, usersRow) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ lines: linesRow.lines, contributors: usersRow.contributors });
    });
  });
});

// Get all flagged lines
router.get('/flags', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  db.all(`
    SELECT flags.id, flags.line_id, flags.created_at, lines.text, lines.username, lines.color
    FROM flags
    JOIN lines ON lines.id = flags.line_id
    ORDER BY flags.created_at DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ flags: rows });
  });
});


// Resolve a flag
router.post('/flag/:id/resolve', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  const id = req.params.id;
  db.run("UPDATE line_flags SET resolved = 1 WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Admin log route
router.post('/log', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

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

module.exports = router;