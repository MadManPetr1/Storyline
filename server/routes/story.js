const express = require('express');
const db = require('../db/database');
const router = express.Router();

// Helper for last rename
function getLastRename(storyId, cb) {
  db.get(
    "SELECT * FROM story_renames WHERE story_id = ? ORDER BY renamed_at DESC LIMIT 1",
    [storyId],
    cb
  );
}

// GET /api/story/current -- get current story and all lines
router.get('/current', (req, res) => {
  db.get("SELECT * FROM stories ORDER BY created_at DESC LIMIT 1", [], (err, story) => {
    if (err || !story) return res.status(404).json({ error: 'No story found' });
    db.all("SELECT * FROM lines WHERE story_id = ? ORDER BY created_at ASC", [story.id], (err, lines) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ story, lines });
    });
  });
});

// POST /api/story/rename -- rename story with cooldown
router.post('/rename', (req, res) => {
  const { name, username } = req.body;
  if (!name || name.length < 2) return res.status(400).json({ error: 'Invalid story name' });

  db.get("SELECT * FROM stories ORDER BY created_at DESC LIMIT 1", [], (err, story) => {
    if (err || !story) return res.status(404).json({ error: 'No story to rename' });

    getLastRename(story.id, (err, lastRename) => {
      if (err) return res.status(500).json({ error: err.message });

      // Check cooldown (7 days)
      if (lastRename && lastRename.renamed_at) {
        const lastTime = new Date(lastRename.renamed_at);
        const now = new Date();
        const diffDays = (now - lastTime) / (1000 * 60 * 60 * 24);
        if (diffDays < 7) {
          const nextAllowed = new Date(lastTime.getTime() + 7 * 24 * 60 * 60 * 1000);
          return res.status(429).json({
            error: 'Rename cooldown active.',
            nextAllowed: nextAllowed.toISOString(),
            lastRenamer: lastRename.username
          });
        }
      }

      db.run("UPDATE stories SET name = ? WHERE id = ?", [name, story.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.run(
          "INSERT INTO story_renames (story_id, username) VALUES (?, ?)",
          [story.id, username || 'anonymous'],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, newName: name });
          }
        );
      });
    });
  });
});

// GET /api/story/rename-status -- get current rename cooldown info
router.get('/rename-status', (req, res) => {
  db.get("SELECT * FROM stories ORDER BY created_at DESC LIMIT 1", [], (err, story) => {
    if (err || !story) return res.status(404).json({ error: 'No story found' });

    getLastRename(story.id, (err, lastRename) => {
      if (err) return res.status(500).json({ error: err.message });
      let cooldown = 0, nextAllowed = null, lastRenamer = null;
      if (lastRename && lastRename.renamed_at) {
        const lastTime = new Date(lastRename.renamed_at);
        const now = new Date();
        cooldown = (now - lastTime) / (1000 * 60 * 60 * 24);
        nextAllowed = new Date(lastTime.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        lastRenamer = lastRename.username;
      }
      res.json({
        cooldown: cooldown,
        nextAllowed,
        lastRenamer
      });
    });
  });
});

module.exports = router;