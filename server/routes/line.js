// server/routes/line.js
const express = require('express');
const db = require('../db/database');
const router = express.Router();

// Helper: get IP, accounting for proxies (like Render)
function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim();
}

// POST /api/line — Add a new line
router.post('/', (req, res) => {
  const { text, username = '', color = '' } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length < 1 || text.trim().length > 140) {
    return res.status(400).json({ error: 'Invalid line text.' });
  }

  const ip = getClientIp(req);

  // Check if this IP already posted in the last 24h
  db.get(
    "SELECT created_at FROM lines WHERE ip = ? ORDER BY created_at DESC LIMIT 1",
    [ip],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      if (row && Date.now() - new Date(row.created_at).getTime() < 24 * 60 * 60 * 1000) {
        const nextAllowed = new Date(new Date(row.created_at).getTime() + 24 * 60 * 60 * 1000);
        return res.status(429).json({
          error: "Limit: Only one line per day.",
          nextAllowed: nextAllowed.toISOString()
        });
      }
      // Insert new line
      db.get("SELECT id FROM stories ORDER BY created_at DESC LIMIT 1", [], (err, story) => {
        if (err || !story) return res.status(404).json({ error: 'No active story.' });
        db.run(
          "INSERT INTO lines (story_id, text, username, color, ip, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
          [story.id, text.trim(), username.trim(), color, ip],
          function (err) {
            if (err) return res.status(500).json({ error: 'Failed to add line.' });
            return res.json({ success: true, id: this.lastID });
          }
        );
      });
    }
  );
});

// GET /api/line/cooldown — Get current user's line cooldown (in seconds)
router.get('/cooldown', (req, res) => {
  const ip = getClientIp(req);
  db.get(
    "SELECT created_at FROM lines WHERE ip = ? ORDER BY created_at DESC LIMIT 1",
    [ip],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      if (!row) return res.json({ cooldown: 0, nextAllowed: null });
      const last = new Date(row.created_at).getTime();
      const now = Date.now();
      const left = Math.max(0, 24 * 60 * 60 * 1000 - (now - last));
      return res.json({
        cooldown: Math.ceil(left / 1000), // in seconds
        nextAllowed: left > 0 ? new Date(last + 24*60*60*1000).toISOString() : null
      });
    }
  );
});

module.exports = router;