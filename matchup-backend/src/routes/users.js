const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM users 
       WHERE firebase_uid = $1 
       OR id::text = $1 
       LIMIT 1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Get user error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { name, sport, skill_level, availability, radius_km } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        sport = COALESCE($2, sport),
        skill_level = COALESCE($3, skill_level),
        availability = COALESCE($4, availability),
        radius_km = COALESCE($5, radius_km)
       WHERE firebase_uid = $6
       OR id::text = $6
       RETURNING *`,
      [name, sport, skill_level, availability, radius_km, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Update user error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;