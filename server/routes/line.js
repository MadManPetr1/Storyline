const express = require('express');
const db = require('../db/database');
const router = express.Router();

function getIp(req) {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
}

router.post('/', (req, res) => {
  const { text, username, color } = req.body;
  const ip = getIp(req);

  if (!text || text.length < 1) return res.status(400).json({ error: 'Text required' });

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  db.get(`
    SELECT * FROM lines WHERE (ip = ? OR (username IS NOT NULL AND username = ?))
    AND created_at > ? ORDER BY created_at DESC LIMIT 1
  `, [ip, username, dayAgo], (err, last) => {
    if (last) return res.status(429).json({ error: 'Daily limit reached' });

    db.get("SELECT * FROM stories ORDER BY created_at DESC LIMIT 1", [], (err, story) => {
      if (err || !story) return res.status(404).json({ error: 'No active story' });

      db.run(
        "INSERT INTO lines (story_id, text, username, color, ip) VALUES (?, ?, ?, ?, ?)",
        [story.id, text, username, color, ip],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ id: this.lastID });
        }
      );
    });
  });
});

module.exports = router;