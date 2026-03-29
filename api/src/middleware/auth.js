import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
}

async function resolveApiKey(key) {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const { rows } = await pool.query(`
    SELECT ak.id as key_id, ak.user_id, u.id, u.email, u.role
    FROM api_keys ak JOIN users u ON ak.user_id = u.id
    WHERE ak.key_hash = $1
  `, [hash]);
  if (!rows[0]) return null;
  // Update last_used_at in background
  pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [rows[0].key_id]).catch(() => {});
  return { id: rows[0].user_id, email: rows[0].email, role: rows[0].role };
}

export function authRequired(req, res, next) {
  // Check API key first
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    resolveApiKey(apiKey).then(user => {
      if (!user) return res.status(401).json({ error: 'Invalid API key' });
      req.user = user;
      next();
    }).catch(() => res.status(401).json({ error: 'Invalid API key' }));
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function authOptional(req, _res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    resolveApiKey(apiKey).then(user => {
      if (user) req.user = user;
      next();
    }).catch(() => next());
    return;
  }

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), JWT_SECRET); } catch {}
  }
  next();
}
