// routes/flag.js
const express = require('express');
const db = require('../db/database');
const router = express.Router();

router.post('/:id', (req, res) => {
  const lineId = parseInt(req.params.id, 10);
  const { reason } = req.body;
  const flaggedBy = req.ip || 'anonymous';

  if (!lineId || isNaN(lineId)) {
    return res.status(400).json({ error: 'Invalid line ID.' });
  }

  if (!reason || reason.trim().length < 2) {
    return res.status(400).json({ error: 'Reason too short.' });
  }

  db.run(
    "INSERT INTO line_flags (line_id, reason, flagged_by, flagged_at) VALUES (?, ?, ?, datetime('now'))",
    [lineId, reason.trim(), flaggedBy],
    function (err) {
      console.log(`📩 Incoming flag for line ${lineId} with reason: ${reason}`);
      if (err) {
        console.error("❌ DB ERROR while flagging:", err.message);
        return res.status(500).json({ error: 'Failed to flag line.' });
      }
      res.json({ success: true });
    }
  );
});

module.exports = router;