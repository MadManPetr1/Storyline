const express = require('express');
const db = require('../db/database');
const router = express.Router();

function isAdmin(req) {
  const password = req.headers['x-admin-password'];
  return password && password === process.env.ADMIN_PASSWORD;
}

router.delete('/line/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  db.run("DELETE FROM lines WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;