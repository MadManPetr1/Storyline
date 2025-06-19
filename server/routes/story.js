const express = require('express');
const db = require('../db/database');
const router = express.Router();

router.get('/current', (req, res) => {
  db.get("SELECT * FROM stories ORDER BY created_at DESC LIMIT 1", [], (err, story) => {
    if (err || !story) return res.status(404).json({ error: 'No story found' });
    db.all("SELECT * FROM lines WHERE story_id = ? ORDER BY created_at ASC", [story.id], (err, lines) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ story, lines });
    });
  });
});

router.post('/rename', (req, res) => {
  const { name } = req.body;
  if (!name || name.length < 2) return res.status(400).json({ error: 'Invalid story name' });

  db.get("SELECT * FROM stories ORDER BY created_at DESC LIMIT 1", [], (err, story) => {
    if (err || !story) return res.status(404).json({ error: 'No story to rename' });

    // TODO: Implement cooldown logic per IP/username (store last rename in a simple table)
    db.run("UPDATE stories SET name = ? WHERE id = ?", [name, story.id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

router.get('/archive', (req, res) => {
  db.all("SELECT * FROM stories WHERE archived_at IS NOT NULL ORDER BY archived_at DESC", [], (err, stories) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(stories);
  });
});

module.exports = router;