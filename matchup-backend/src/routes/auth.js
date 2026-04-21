const router = require('express').Router();
const pool   = require('../db/pool');

router.post('/register', async (req, res) => {
  const {
    firebase_uid, name, email, sport,
    skill_level, latitude, longitude,
    radius_km, availability, age, gender,
    user_type, coach_info,
  } = req.body;

  if (!firebase_uid || !name || !email) {
    return res.status(400).json({ error: 'firebase_uid, name, and email are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO users
         (firebase_uid, name, email, sport, skill_level,
          latitude, longitude, radius_km, availability,
          age, gender, user_type, coach_info)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (firebase_uid)
       DO UPDATE SET
         name        = EXCLUDED.name,
         email       = EXCLUDED.email,
         sport       = EXCLUDED.sport,
         skill_level = EXCLUDED.skill_level,
         latitude    = EXCLUDED.latitude,
         longitude   = EXCLUDED.longitude,
         radius_km   = EXCLUDED.radius_km,
         availability= EXCLUDED.availability,
         age         = EXCLUDED.age,
         gender      = EXCLUDED.gender,
         user_type   = EXCLUDED.user_type,
         coach_info  = EXCLUDED.coach_info
       RETURNING *`,
      [
        firebase_uid,
        name,
        email,
        sport        || 'Tennis',
        skill_level  || 'Intermediate',
        latitude     ?? 51.5074,
        longitude    ?? -0.1278,
        radius_km    || 10,
        availability || [],
        age          || null,
        gender       || null,
        user_type    || 'player',
        coach_info   || null,
      ]
    );

    console.log(`User registered: ${name} (${email})`);
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Register error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;