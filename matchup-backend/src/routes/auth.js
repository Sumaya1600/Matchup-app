const router = require('express').Router();
const pool = require('../db/pool');

router.post('/register', async (req, res) => {
  const {
    firebase_uid, name, email, sport,
    skill_level, latitude, longitude,
    radius_km, availability
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO users 
        (firebase_uid, name, email, sport, skill_level, 
         latitude, longitude, radius_km, availability)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (firebase_uid) 
       DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [
        firebase_uid, name, email,
        sport || 'Tennis', skill_level,
        latitude || 51.5074,
        longitude || -0.1278,
        radius_km || 10,
        availability || []
      ]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Register error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;