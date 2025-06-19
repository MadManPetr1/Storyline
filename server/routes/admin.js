const express = require('express');
const db = require('../db/database');
const router = express.Router();
const path = require('path');

function isAdmin(req) {
  const password = req.headers['x-admin-password'];
  return password && password === process.env.ADMIN_PASSWORD;
}

router.delete('/line/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  const lineId = req.params.id;
  db.run("DELETE FROM lines WHERE id = ?", [lineId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Line not found' });
    res.json({ success: true });
  });
});

router.get('/download-db', (req, res) => {
  // Password check here!
  const dbPath = process.env.DB_PATH || '/data/database.sqlite';
  res.download(dbPath, 'database.sqlite');
});

module.exports = router;