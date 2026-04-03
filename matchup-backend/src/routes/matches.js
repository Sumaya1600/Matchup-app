const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

function calculateScore(user, candidate) {
  let score = 0;

  const levels = [
    'Beginner (1.0-2.5)',
    'Intermediate (3.0-3.5)',
    'Advanced (4.0-4.5)',
    'Professional (5.0+)'
  ];
  const diff = Math.abs(
    levels.indexOf(user.skill_level) -
    levels.indexOf(candidate.skill_level)
  );
  if (diff === 0) score += 40;
  else if (diff === 1) score += 25;
  else if (diff === 2) score += 10;

  const userSlots = user.availability || [];
  const candSlots = candidate.availability || [];
  const overlap = userSlots.filter(s => candSlots.includes(s)).length;
  const maxSlots = Math.max(userSlots.length, 1);
  score += Math.round((overlap / maxSlots) * 30);

  const R = 6371;
  const dLat = (candidate.latitude - user.latitude) * Math.PI / 180;
  const dLon = (candidate.longitude - user.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(user.latitude * Math.PI / 180) *
    Math.cos(candidate.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const radius = user.radius_km || 10;
  if (dist <= radius) {
    score += Math.round((1 - dist / radius) * 20);
  }

  score += Math.round((candidate.reliability_score / 5) * 10);
  return Math.min(score, 100);
}

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
         SELECT CASE 
           WHEN requester_id = $2 THEN receiver_id 
           ELSE requester_id 
         END
         FROM matches
         WHERE (requester_id = $2 OR receiver_id = $2)
         AND status IN ('pending', 'accepted')
       )`,
      [user.sport, user.id]
    );

    const scored = candidatesRes.rows
      .map(c => ({ ...c, compatibility_score: calculateScore(user, c) }))
      .filter(c => c.compatibility_score > 0)
      .sort((a, b) => b.compatibility_score - a.compatibility_score)
      .slice(0, 20);

    res.json(scored);
  } catch (e) {
    console.error('Suggestions error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/request', auth, async (req, res) => {
  const { requester_id, receiver_id, sport } = req.body;
  try {
    const [rqRes, rcRes] = await Promise.all([
      pool.query(
        'SELECT * FROM users WHERE firebase_uid = $1 OR id::text = $1 LIMIT 1',
        [requester_id]
      ),
      pool.query(
        'SELECT * FROM users WHERE id::text = $1 LIMIT 1',
        [receiver_id]
      ),
    ]);
    const score = calculateScore(rqRes.rows[0], rcRes.rows[0]);
    const result = await pool.query(
      `INSERT INTO matches (requester_id, receiver_id, sport, compatibility_score)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [rqRes.rows[0].id, receiver_id, sport || 'Tennis', score]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Match request error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/pending/:uid', auth, async (req, res) => {
  try {
    const userRes = await pool.query(
      'SELECT id FROM users WHERE firebase_uid = $1 OR id::text = $1 LIMIT 1',
      [req.params.uid]
    );
    if (!userRes.rows[0]) return res.json([]);
    const result = await pool.query(
      `SELECT m.*, u.name as requester_name,
              u.skill_level, u.reliability_score
       FROM matches m
       JOIN users u ON u.id = m.requester_id
       WHERE m.receiver_id = $1
       AND m.status = 'pending'
       ORDER BY m.created_at DESC`,
      [userRes.rows[0].id]
    );
    res.json(result.rows);
  } catch (e) {
    console.error('Pending error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id/respond', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE matches SET status = $1 WHERE id::text = $2 RETURNING *`,
      [req.body.response, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id/schedule', auth, async (req, res) => {
  const { scheduled_time, court_name } = req.body;
  try {
    const result = await pool.query(
      `UPDATE matches SET scheduled_time = $1, court_name = $2 
       WHERE id::text = $3 RETURNING *`,
      [scheduled_time, court_name, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/rate', auth, async (req, res) => {
  const { rated_user_id, rating } = req.body;
  try {
    await pool.query(
      `UPDATE users SET
        reliability_score = ROUND(
          ((reliability_score * total_matches + $1) /
           (total_matches + 1))::numeric, 2
        ),
        total_matches = total_matches + 1
       WHERE id::text = $2`,
      [rating, rated_user_id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;