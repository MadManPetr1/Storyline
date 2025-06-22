// routes/flag.js
const express = require('express');
const db = require('../db/database');
const router = express.Router();

router.post('/:id', (req, res) => {
  const lineId = req.params.id;
  const { reason } = req.body;
  const flaggedBy = req.ip || 'anonymous';

  if (!reason || reason.trim().length < 2) {
    return res.status(400).json({ error: 'Reason too short.' });
  }

  db.run(
    "INSERT INTO line_flags (line_id, reason, flagged_by, flagged_at) VALUES (?, ?, ?, datetime('now'))",
    [lineId, reason, flaggedBy],
    function (err) {
      if (err) {
        console.error("Flag insert failed:", err.message); // ✅ helpful log
        return res.status(500).json({ error: 'Failed to flag line.' });
      }
      res.json({ success: true });
    }
  );
});

module.exports = router;