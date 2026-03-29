import { Router } from 'express';
import pool from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// Add review for an agent (must have completed a task)
router.post('/:slug/reviews', authRequired, async (req, res) => {
  const { rating, comment, task_id } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

  try {
    const agentRes = await pool.query('SELECT id FROM agents WHERE slug = $1', [req.params.slug]);
    if (!agentRes.rows[0]) return res.status(404).json({ error: 'Agent not found' });
    const agentId = agentRes.rows[0].id;

    // Verify user has a completed task with this agent
    const taskCheck = await pool.query(
      "SELECT id FROM tasks WHERE agent_id = $1 AND user_id = $2 AND status = 'completed' LIMIT 1",
      [agentId, req.user.id]
    );
    if (!taskCheck.rows[0]) return res.status(403).json({ error: 'Must complete a task before reviewing' });

    const { rows } = await pool.query(`
      INSERT INTO reviews (agent_id, user_id, task_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [agentId, req.user.id, task_id || taskCheck.rows[0].id, rating, comment || null]);

    // Update agent avg_rating
    await pool.query(`
      UPDATE agents SET
        avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE agent_id = $1),
        review_count = (SELECT COUNT(*) FROM reviews WHERE agent_id = $1)
      WHERE id = $1
    `, [agentId]);

    res.status(201).json({ review: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already reviewed this task' });
    console.error('Review error:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

export default router;
