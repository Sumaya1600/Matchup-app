const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateScore(user, candidate) {
  let score = 0;

  // 1. Skill (max 40)
  const uSkill = SKILL_LEVELS.indexOf(user.skill_level);
  const cSkill = SKILL_LEVELS.indexOf(candidate.skill_level);
  const diff = Math.abs(uSkill - cSkill);
  if      (diff === 0) score += 40;
  else if (diff === 1) score += 25;
  else if (diff === 2) score += 10;

  // 2. Availability overlap (max 30)
  const uSlots = Array.isArray(user.availability)      ? user.availability      : [];
  const cSlots = Array.isArray(candidate.availability) ? candidate.availability : [];
  const overlap = uSlots.filter(s => cSlots.includes(s)).length;
  score += Math.round((overlap / Math.max(uSlots.length, 1)) * 30);

  // 3. Distance (max 20)
  const distKm = haversineKm(user.latitude, user.longitude, candidate.latitude, candidate.longitude);
  const radius = user.radius_km || 10;
  if (distKm <= radius) {
    score += Math.round((1 - distKm / radius) * 20);
  }

  // 4. Reliability (max 10)
  score += Math.round((Number(candidate.reliability_score) / 5) * 10);

  return Math.min(score, 100);
}

// GET /api/matches/suggestions/:uid
router.get('/suggestions/:uid', auth, async (req, res) => {
  try {
    const userRes = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = $1 OR id::text = $1 LIMIT 1',
      [req.params.uid]
    );
    if (!userRes.rows[0]) return res.json([]);
    const user = userRes.rows[0];

    const candidatesRes = await pool.query(
      `SELECT * FROM users
       WHERE sport = $1 AND id != $2
         AND id NOT IN (
           SELECT CASE WHEN requester_id = $2 THEN receiver_id ELSE requester_id END
           FROM matches
           WHERE (requester_id = $2 OR receiver_id = $2)
             AND status IN ('pending','accepted')
         )`,
      [user.sport, user.id]
    );

    const scored = candidatesRes.rows
      .map(c => {
        const distKm  = haversineKm(user.latitude, user.longitude, c.latitude, c.longitude);
        const distMiles = (distKm * 0.621371).toFixed(1);
        return {
          ...c,
          compatibility_score: calculateScore(user, c),
          distance_miles: parseFloat(distMiles),
        };
      })
      .sort((a, b) => b.compatibility_score - a.compatibility_score)
      .slice(0, 20);

    res.json(scored);
  } catch (e) {
    console.error('Suggestions error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/matches/request
router.post('/request', auth, async (req, res) => {
  const { requester_id, receiver_id, sport } = req.body;
  if (!requester_id || !receiver_id)
    return res.status(400).json({ error: 'requester_id and receiver_id are required' });

  try {
    const [rqRes, rcRes] = await Promise.all([
      pool.query('SELECT * FROM users WHERE firebase_uid = $1 OR id::text = $1 LIMIT 1', [String(requester_id)]),
      pool.query('SELECT * FROM users WHERE id::text = $1 LIMIT 1', [String(receiver_id)]),
    ]);
    if (!rqRes.rows[0]) return res.status(404).json({ error: 'Requester not found' });
    if (!rcRes.rows[0]) return res.status(404).json({ error: 'Receiver not found' });

    const existing = await pool.query(
      `SELECT id FROM matches WHERE requester_id=$1 AND receiver_id=$2 AND status='pending'`,
      [rqRes.rows[0].id, rcRes.rows[0].id]
    );
    if (existing.rows[0]) return res.status(409).json({ error: 'Match request already pending' });

    const score = calculateScore(rqRes.rows[0], rcRes.rows[0]);
    const result = await pool.query(
      `INSERT INTO matches (requester_id, receiver_id, sport, compatibility_score)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [rqRes.rows[0].id, rcRes.rows[0].id, sport || 'Tennis', score]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Match request error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/matches/pending/:uid
router.get('/pending/:uid', auth, async (req, res) => {
  try {
    const userRes = await pool.query(
      'SELECT id FROM users WHERE firebase_uid = $1 OR id::text = $1 LIMIT 1',
      [req.params.uid]
    );
    if (!userRes.rows[0]) return res.json([]);

    const result = await pool.query(
      `SELECT m.*, u.name AS requester_name, u.skill_level, u.reliability_score, u.age, u.gender
       FROM matches m JOIN users u ON u.id = m.requester_id
       WHERE m.receiver_id = $1 AND m.status = 'pending'
       ORDER BY m.created_at DESC`,
      [userRes.rows[0].id]
    );
    res.json(result.rows);
  } catch (e) {
    console.error('Pending matches error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/matches/:id/respond
router.put('/:id/respond', auth, async (req, res) => {
  const { response } = req.body;
  if (!['accepted','declined'].includes(response))
    return res.status(400).json({ error: 'response must be "accepted" or "declined"' });

  try {
    const result = await pool.query(
      `UPDATE matches SET status=$1 WHERE id::text=$2 RETURNING *`,
      [response, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Match not found' });
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Respond error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/matches/:id/schedule
router.put('/:id/schedule', auth, async (req, res) => {
  const { scheduled_time, court_name } = req.body;
  try {
    const result = await pool.query(
      `UPDATE matches SET scheduled_time=$1, court_name=$2 WHERE id::text=$3 RETURNING *`,
      [scheduled_time || null, court_name || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Match not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/matches/:id/rate
router.post('/:id/rate', auth, async (req, res) => {
  const { rated_user_id, rating } = req.body;
  if (!rated_user_id || rating === undefined)
    return res.status(400).json({ error: 'rated_user_id and rating are required' });

  const numRating = Number(rating);
  if (isNaN(numRating) || numRating < 1 || numRating > 5)
    return res.status(400).json({ error: 'Rating must be 1-5' });

  try {
    // Update reliability score
    const result = await pool.query(
      `UPDATE users SET
         reliability_score = ROUND(((reliability_score * total_matches + $1) / (total_matches + 1))::numeric, 2),
         total_matches = total_matches + 1
       WHERE id::text = $2
       RETURNING id, name, reliability_score, total_matches`,
      [numRating, String(rated_user_id)]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });

    // Mark match as completed so it can't be rated again
    await pool.query(
      `UPDATE matches SET status = 'completed' WHERE id::text = $1`,
      [req.params.id]
    );

    console.log(`Rated user ${result.rows[0].name}: new score ${result.rows[0].reliability_score}`);
    res.json({ success: true, ...result.rows[0] });
  } catch (e) {
    console.error('Rate error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/matches/accepted/:uid
router.get('/accepted/:uid', auth, async (req, res) => {
  try {
    const userRes = await pool.query(
      'SELECT id FROM users WHERE firebase_uid = $1 OR id::text = $1 LIMIT 1',
      [req.params.uid]
    );
    if (!userRes.rows[0]) return res.json([]);
    const userId = userRes.rows[0].id;

    const result = await pool.query(
      `SELECT m.*,
              CASE WHEN m.requester_id=$1 THEN r.name ELSE u.name END AS other_name,
              CASE WHEN m.requester_id=$1 THEN r.skill_level ELSE u.skill_level END AS skill_level,
              CASE WHEN m.requester_id=$1 THEN m.receiver_id ELSE m.requester_id END AS other_user_id
       FROM matches m
       JOIN users u ON u.id = m.requester_id
       JOIN users r ON r.id = m.receiver_id
       WHERE (m.requester_id=$1 OR m.receiver_id=$1) AND m.status='accepted'
       ORDER BY m.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;