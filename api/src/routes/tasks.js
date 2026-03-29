import { Router } from 'express';
import pool from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';
import { executeRest } from '../adapters/rest.js';
import { executeMcp } from '../adapters/mcp.js';
import { executeA2a } from '../adapters/a2a.js';
import { executeOpenclaw } from '../adapters/openclaw.js';

const router = Router();

// Execute/hire an agent
router.post('/agents/:slug/run', authRequired, async (req, res) => {
  const { slug } = req.params;
  const input = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get agent
    const agentRes = await client.query('SELECT * FROM agents WHERE slug = $1 AND is_public = true', [slug]);
    const agent = agentRes.rows[0];
    if (!agent) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Agent not found' }); }

    // Check user credits
    const userRes = await client.query('SELECT credits FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const credits = userRes.rows[0]?.credits || 0;
    if (credits < agent.credits_per_task) {
      await client.query('ROLLBACK');
      return res.status(402).json({ error: 'Insufficient credits', needed: agent.credits_per_task, have: credits });
    }

    // Deduct credits (hold)
    await client.query('UPDATE users SET credits = credits - $1 WHERE id = $2', [agent.credits_per_task, req.user.id]);
    await client.query(`
      INSERT INTO credit_transactions (user_id, type, amount, description)
      VALUES ($1, 'task_charge', $2, $3)
    `, [req.user.id, -agent.credits_per_task, `Hired ${agent.name}`]);

    // Create task record
    const taskRes = await client.query(`
      INSERT INTO tasks (agent_id, user_id, status, input, credits_charged, protocol_used, started_at)
      VALUES ($1, $2, 'running', $3, $4, $5, NOW())
      RETURNING *
    `, [agent.id, req.user.id, JSON.stringify(input), agent.credits_per_task, agent.protocol]);

    const task = taskRes.rows[0];
    await client.query('COMMIT');

    // Execute via protocol adapter (outside transaction)
    let result;
    switch (agent.protocol) {
      case 'rest': result = await executeRest(agent, input); break;
      case 'mcp': result = await executeMcp(agent, input); break;
      case 'a2a': result = await executeA2a(agent, input); break;
      case 'openclaw': result = await executeOpenclaw(agent, input); break;
      default: result = { success: false, error: `Unknown protocol: ${agent.protocol}` };
    }

    if (result.success) {
      // Update task as completed
      await pool.query(`
        UPDATE tasks SET status = 'completed', output = $1, latency_ms = $2, completed_at = NOW()
        WHERE id = $3
      `, [JSON.stringify(result.output), result.latency_ms, task.id]);

      // Update agent stats
      await pool.query(`
        UPDATE agents SET total_runs = total_runs + 1,
          success_rate = (success_rate * total_runs + 1.0) / (total_runs + 1)
        WHERE id = $1
      `, [agent.id]);

      // Credit the builder (earnings)
      await pool.query('UPDATE users SET credits = credits + $1 WHERE id = $2', [agent.credits_per_task, agent.owner_id]);
      await pool.query(`
        INSERT INTO credit_transactions (user_id, type, amount, description)
        VALUES ($1, 'earning', $2, $3)
      `, [agent.owner_id, agent.credits_per_task, `Earned from ${agent.name}`]);

      res.json({ task_id: task.id, status: 'completed', output: result.output, latency_ms: result.latency_ms });
    } else {
      // Refund credits on failure
      await pool.query('UPDATE users SET credits = credits + $1 WHERE id = $2', [agent.credits_per_task, req.user.id]);
      await pool.query(`
        INSERT INTO credit_transactions (user_id, type, amount, description)
        VALUES ($1, 'task_refund', $2, $3)
      `, [req.user.id, agent.credits_per_task, `Refund: ${agent.name} failed`]);

      await pool.query(`
        UPDATE tasks SET status = 'failed', error = $1, latency_ms = $2, completed_at = NOW()
        WHERE id = $3
      `, [result.error, result.latency_ms, task.id]);

      // Update agent stats (failure)
      await pool.query(`
        UPDATE agents SET total_runs = total_runs + 1,
          success_rate = (success_rate * total_runs) / (total_runs + 1)
        WHERE id = $1
      `, [agent.id]);

      res.status(502).json({ task_id: task.id, status: 'failed', error: result.error, latency_ms: result.latency_ms });
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Task execution error:', err);
    res.status(500).json({ error: 'Task execution failed' });
  } finally {
    client.release();
  }
});

// Get task status
router.get('/tasks/:id', authRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json({ task: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// List my tasks
router.get('/tasks', authRequired, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, +page) - 1) * +limit;
  try {
    const { rows } = await pool.query(`
      SELECT t.*, a.name as agent_name, a.slug as agent_slug
      FROM tasks t JOIN agents a ON t.agent_id = a.id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC LIMIT $2 OFFSET $3
    `, [req.user.id, Math.min(50, +limit), offset]);
    res.json({ tasks: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

export default router;
