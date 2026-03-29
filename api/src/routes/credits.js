import { Router } from 'express';
import pool from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

const CREDIT_PACKS = [
  { id: 'pack_500', credits: 500, price_cents: 500, label: '500 credits — $5' },
  { id: 'pack_1000', credits: 1000, price_cents: 1000, label: '1,000 credits — $10' },
  { id: 'pack_5000', credits: 5000, price_cents: 4500, label: '5,000 credits — $45' },
  { id: 'pack_10000', credits: 10000, price_cents: 8000, label: '10,000 credits — $80' },
];

// Get credit packs
router.get('/packs', (_req, res) => {
  res.json({ packs: CREDIT_PACKS });
});

// Purchase credits (creates Stripe checkout session or direct for testing)
router.post('/purchase', authRequired, async (req, res) => {
  const { pack_id } = req.body;
  const pack = CREDIT_PACKS.find(p => p.id === pack_id);
  if (!pack) return res.status(400).json({ error: 'Invalid pack' });

  // In production: create Stripe Checkout session and return URL
  // For now: direct credit for testing
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_xxx') {
    // Stripe integration would go here
    return res.status(501).json({ error: 'Stripe integration pending — use /credits/test-purchase for testing' });
  }

  // Test mode: directly add credits
  try {
    await pool.query('UPDATE users SET credits = credits + $1 WHERE id = $2', [pack.credits, req.user.id]);
    await pool.query(`
      INSERT INTO credit_transactions (user_id, type, amount, description)
      VALUES ($1, 'purchase', $2, $3)
    `, [req.user.id, pack.credits, `Purchased ${pack.label}`]);

    const { rows } = await pool.query('SELECT credits FROM users WHERE id = $1', [req.user.id]);
    res.json({ credits: rows[0].credits, purchased: pack.credits });
  } catch (err) {
    console.error('Purchase error:', err);
    res.status(500).json({ error: 'Purchase failed' });
  }
});

// Get transaction history
router.get('/history', authRequired, async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (Math.max(1, +page) - 1) * +limit;
  try {
    const { rows } = await pool.query(`
      SELECT * FROM credit_transactions WHERE user_id = $1
      ORDER BY created_at DESC LIMIT $2 OFFSET $3
    `, [req.user.id, Math.min(100, +limit), offset]);
    res.json({ transactions: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Builder: get earnings summary
router.get('/earnings', authRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'earning' THEN amount ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN type = 'payout' THEN -amount ELSE 0 END), 0) as total_paid_out
      FROM credit_transactions WHERE user_id = $1
    `, [req.user.id]);

    const userRes = await pool.query('SELECT credits FROM users WHERE id = $1', [req.user.id]);
    res.json({
      credits: userRes.rows[0]?.credits || 0,
      total_earned: +rows[0].total_earned,
      total_paid_out: +rows[0].total_paid_out,
      cashout_rate: 0.0075, // $0.0075 per credit
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get earnings' });
  }
});

export default router;
