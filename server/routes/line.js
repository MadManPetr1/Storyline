const express = require('express');
const db = require('../db/database');
const router = express.Router();

// Cooldown in ms (22 hours)
const COOLDOWN_MS = 22 * 60 * 60 * 1000;

// Helper: get IP, accounting for proxies (like Render)
function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim();
}

// POST /api/line — Add a new line
router.post('/', (req, res) => {
  const { text, username = '', color = '' } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length < 1 || text.trim().length > 512) {
    return res.status(400).json({ error: 'Invalid line text. (1–512 characters required)' });
  }

  const ip = getClientIp(req);

  // Check cooldown
  db.get(
    "SELECT created_at FROM lines WHERE ip = ? ORDER BY created_at DESC LIMIT 1",
    [ip],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error.' });

      const lastTime = row ? new Date(row.created_at).getTime() : 0;
      const now = Date.now();
      if (row && now - lastTime < COOLDOWN_MS) {
        const nextAllowed = new Date(lastTime + COOLDOWN_MS);
        return res.status(429).json({
          error: "Limit: Only one line per 22 hours.",
          nextAllowed: nextAllowed.toISOString()
        });
      }

      // Insert line
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

// GET /api/line/cooldown — Get cooldown info for current user
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
      const left = Math.max(0, COOLDOWN_MS - (now - last));

      return res.json({
        cooldown: Math.ceil(left / 1000), // seconds
        nextAllowed: left > 0 ? new Date(last + COOLDOWN_MS).toISOString() : null
      });
    }
  );
});

module.exports = router;