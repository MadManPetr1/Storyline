// routes/flag.js
const express = require('express');
const db = require('../db/database');
const router = express.Router();

router.post('/:id', (req, res) => {
  const lineId = req.params.id;
  const { reason } = req.body;
  const flaggedBy = req.ip || 'anonymous';

  console.log("[FLAG] Incoming flag:", { lineId, reason, flaggedBy });

  if (!reason || reason.trim().length < 2) {
    return res.status(400).json({ error: 'Reason too short.' });
  }

  db.run(
    `INSERT INTO line_flags (line_id, reason, flagged_by, flagged_at) 
     VALUES (?, ?, ?, datetime('now'))`,
    [lineId, reason.trim(), flaggedBy],
    function (err) {
      if (err) {
        console.error("[FLAG] DB error:", err.message);
        return res.status(500).json({ error: 'Failed to flag line.' });
      }
      console.log("[FLAG] Success. Inserted flag ID:", this.lastID);
      res.json({ success: true });
    }
  );
});

module.exports = router;