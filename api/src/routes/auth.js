import { Router } from 'express';
import pool from '../db/pool.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

// GitHub OAuth callback — frontend sends us the GitHub user info after OAuth
router.post('/github', async (req, res) => {
  const { github_id, email, name, avatar_url } = req.body;
  if (!github_id || !name) return res.status(400).json({ error: 'github_id and name required' });

  try {
    // Upsert user
    const { rows } = await pool.query(`
      INSERT INTO users (github_id, email, name, avatar_url)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (github_id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, users.email),
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url
      RETURNING *
    `, [String(github_id), email, name, avatar_url]);

    const user = rows[0];

    // Give signup bonus if new user (credits = 100 is default)
    if (user.credits === 100) {
      await pool.query(`
        INSERT INTO credit_transactions (user_id, type, amount, description)
        VALUES ($1, 'signup_bonus', 100, 'Welcome bonus — 100 free credits!')
      `, [user.id]);
    }

    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url, credits: user.credits, role: user.role } });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Auth failed' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });

  const jwt = await import('jsonwebtoken');
  try {
    const decoded = jwt.default.verify(header.slice(7), process.env.JWT_SECRET || 'dev-secret');
    const { rows } = await pool.query('SELECT id, name, email, avatar_url, credits, role, created_at FROM users WHERE id = $1', [decoded.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
