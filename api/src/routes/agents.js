import { Router } from 'express';
import pool from '../db/pool.js';
import { authRequired, authOptional } from '../middleware/auth.js';

const router = Router();

// List agents (public, with search/filter)
router.get('/', authOptional, async (req, res) => {
  const { q, category, protocol, sort = 'popular', page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, +page) - 1) * Math.min(50, +limit);
  const params = [];
  const conditions = ['a.is_public = true'];

  if (q) {
    params.push(q);
    conditions.push(`a.search_vec @@ plainto_tsquery('english', $${params.length})`);
  }
  if (category) {
    params.push(category);
    conditions.push(`a.category = $${params.length}`);
  }
  if (protocol) {
    params.push(protocol);
    conditions.push(`a.protocol = $${params.length}`);
  }

  const orderBy = sort === 'recent' ? 'a.created_at DESC' :
                  sort === 'rating' ? 'a.avg_rating DESC, a.review_count DESC' :
                  'a.total_runs DESC, a.avg_rating DESC';

  params.push(Math.min(50, +limit), offset);
  const sql = `
    SELECT a.*, u.name as owner_name, u.avatar_url as owner_avatar
    FROM agents a JOIN users u ON a.owner_id = u.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const countSql = `SELECT count(*) FROM agents a WHERE ${conditions.join(' AND ')}`;

  try {
    const [agentsRes, countRes] = await Promise.all([
      pool.query(sql, params),
      pool.query(countSql, params.slice(0, -2)),
    ]);
    res.json({ agents: agentsRes.rows, total: +countRes.rows[0].count, page: +page, limit: +limit });
  } catch (err) {
    console.error('List agents error:', err);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

// Get single agent by slug (enriched with rating_distribution + recent_tasks)
router.get('/:slug', authOptional, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, u.name as owner_name, u.avatar_url as owner_avatar, u.id as owner_user_id
      FROM agents a JOIN users u ON a.owner_id = u.id
      WHERE a.slug = $1 AND a.is_public = true
    `, [req.params.slug]);
    if (!rows[0]) return res.status(404).json({ error: 'Agent not found' });

    const agentId = rows[0].id;

    // Get reviews, rating distribution, and recent tasks in parallel
    const [reviewsRes, ratingRes, tasksRes] = await Promise.all([
      pool.query(`
        SELECT r.*, u.name as reviewer_name, u.avatar_url as reviewer_avatar
        FROM reviews r JOIN users u ON r.user_id = u.id
        WHERE r.agent_id = $1
        ORDER BY r.created_at DESC LIMIT 10
      `, [agentId]),
      pool.query(`
        SELECT rating, COUNT(*)::int as count
        FROM reviews WHERE agent_id = $1
        GROUP BY rating ORDER BY rating DESC
      `, [agentId]),
      pool.query(`
        SELECT id, status, latency_ms, credits_charged, is_featured,
          LEFT(input::text, 200) as input_preview,
          LEFT(output::text, 200) as output_preview,
          completed_at
        FROM tasks
        WHERE agent_id = $1 AND status = 'completed'
        ORDER BY is_featured DESC, completed_at DESC LIMIT 10
      `, [agentId]),
    ]);

    // Build rating distribution map {5: count, 4: count, ...}
    const rating_distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const row of ratingRes.rows) {
      rating_distribution[row.rating] = row.count;
    }

    res.json({
      agent: rows[0],
      reviews: reviewsRes.rows,
      rating_distribution,
      recent_tasks: tasksRes.rows,
    });
  } catch (err) {
    console.error('Get agent error:', err);
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

// Register new agent (with skills, documentation, source_url, examples)
router.post('/', authRequired, async (req, res) => {
  const { name, tagline, description, category, tags, protocol, endpoint_url,
          mcp_package, mcp_tool, openclaw_package, openclaw_skill,
          input_schema, output_schema, credits_per_task,
          skills, examples, documentation, source_url } = req.body;

  if (!name || !protocol) return res.status(400).json({ error: 'name and protocol required' });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Validate protocol-specific fields
  if (protocol === 'rest' && !endpoint_url) return res.status(400).json({ error: 'REST agents need endpoint_url' });
  if (protocol === 'mcp' && !mcp_package) return res.status(400).json({ error: 'MCP agents need mcp_package' });
  if (protocol === 'a2a' && !endpoint_url) return res.status(400).json({ error: 'A2A agents need endpoint_url' });

  try {
    const { rows } = await pool.query(`
      INSERT INTO agents (owner_id, slug, name, tagline, description, category, tags, protocol,
        endpoint_url, mcp_package, mcp_tool, openclaw_package, openclaw_skill,
        input_schema, output_schema, credits_per_task,
        skills, examples, documentation, source_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *
    `, [req.user.id, slug, name, tagline || null, description || null,
        category || 'other', tags || [], protocol,
        endpoint_url || null, mcp_package || null, mcp_tool || null,
        openclaw_package || null, openclaw_skill || null,
        JSON.stringify(input_schema || {}), JSON.stringify(output_schema || {}),
        credits_per_task || 5,
        skills || [], JSON.stringify(examples || []),
        documentation || null, source_url || null]);

    res.status(201).json({ agent: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Agent with this name already exists' });
    console.error('Create agent error:', err);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// Update agent (with new fields)
router.patch('/:slug', authRequired, async (req, res) => {
  const allowed = ['name', 'tagline', 'description', 'category', 'tags', 'endpoint_url',
    'mcp_package', 'mcp_tool', 'openclaw_package', 'openclaw_skill',
    'input_schema', 'output_schema', 'credits_per_task', 'is_public',
    'skills', 'examples', 'documentation', 'source_url'];

  const updates = [];
  const values = [];
  for (const [key, val] of Object.entries(req.body)) {
    if (allowed.includes(key)) {
      values.push(key.includes('schema') || key === 'examples' ? JSON.stringify(val) : val);
      updates.push(`${key} = $${values.length}`);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  values.push(req.params.slug, req.user.id);
  try {
    const { rows } = await pool.query(
      `UPDATE agents SET ${updates.join(', ')} WHERE slug = $${values.length - 1} AND owner_id = $${values.length} RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Agent not found or not yours' });
    res.json({ agent: rows[0] });
  } catch (err) {
    console.error('Update agent error:', err);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Toggle featured on a task (owner only)
router.patch('/:slug/tasks/:taskId/feature', authRequired, async (req, res) => {
  try {
    // Verify ownership
    const agentRes = await pool.query('SELECT id FROM agents WHERE slug = $1 AND owner_id = $2', [req.params.slug, req.user.id]);
    if (!agentRes.rows[0]) return res.status(404).json({ error: 'Agent not found or not yours' });

    const { rows } = await pool.query(
      'UPDATE tasks SET is_featured = NOT is_featured WHERE id = $1 AND agent_id = $2 RETURNING id, is_featured',
      [req.params.taskId, agentRes.rows[0].id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json({ task: rows[0] });
  } catch (err) {
    console.error('Feature toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle featured' });
  }
});

// Delete agent
router.delete('/:slug', authRequired, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM agents WHERE slug = $1 AND owner_id = $2', [req.params.slug, req.user.id]);
    if (!rowCount) return res.status(404).json({ error: 'Agent not found or not yours' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete agent error:', err);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// My agents (dashboard)
router.get('/my/list', authRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM agents WHERE owner_id = $1 ORDER BY created_at DESC', [req.user.id]
    );
    res.json({ agents: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list your agents' });
  }
});

export default router;
