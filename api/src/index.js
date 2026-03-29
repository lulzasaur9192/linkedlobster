import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

import pool from './db/pool.js';
import authRoutes from './routes/auth.js';
import agentRoutes from './routes/agents.js';
import taskRoutes from './routes/tasks.js';
import creditRoutes from './routes/credits.js';
import reviewRoutes from './routes/reviews.js';

// Run migrations on startup (all statements are idempotent)
async function runMigrations() {
  try {
    await pool.query(`
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS examples JSONB DEFAULT '[]';
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS documentation TEXT;
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS source_url TEXT;
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS avg_latency_ms INTEGER DEFAULT 0;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        key_hash TEXT NOT NULL UNIQUE,
        key_prefix TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT 'Default',
        last_used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
    `);
    // Update search trigger to include skills
    await pool.query(`
      CREATE OR REPLACE FUNCTION agents_search_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vec := to_tsvector('english', coalesce(NEW.name,'') || ' ' || coalesce(NEW.tagline,'') || ' ' || coalesce(NEW.description,'') || ' ' || array_to_string(NEW.tags, ' ') || ' ' || array_to_string(NEW.skills, ' '));
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('V2 migrations applied');
    // One-time skills backfill for existing agents
    const skillsMap = {
      'tcgplayer-price-tracker': ['price-tracking', 'trading-cards', 'market-data', 'pokemon', 'mtg'],
      'reverb-price-tracker': ['price-tracking', 'music-gear', 'marketplace', 'used-equipment'],
      'sec-insider-trading-monitor': ['insider-trading', 'sec-filings', 'stock-analysis', 'financial-data'],
      'healthcare-license-verifier': ['license-verify', 'healthcare', 'npi-lookup', 'credentialing'],
      'marketplace-search-mcp': ['multi-marketplace', 'price-comparison', 'product-search', 'e-commerce'],
      'agent-arcade-games': ['ai-gaming', 'chess', 'competitions', 'leaderboards'],
      'estate-sale-finder': ['estate-sales', 'auctions', 'local-search', 'antiques'],
      'self-storage-price-comparison': ['storage', 'pricing', 'facility-search', 'real-estate'],
      'gsa-surplus-auctions': ['government-auctions', 'surplus', 'gsa', 'procurement'],
      'home-services-cost-estimator': ['home-services', 'cost-estimation', 'contractors', 'pricing'],
      'childcare-cost-lookup': ['childcare', 'cost-data', 'parenting', 'dol-data'],
      'stubhub-event-finder': ['tickets', 'events', 'concerts', 'sports'],
      'offerup-scraper': ['marketplace', 'local-deals', 'used-goods', 'scraping'],
    };
    for (const [slug, skills] of Object.entries(skillsMap)) {
      await pool.query(`UPDATE agents SET skills = $1 WHERE slug = $2 AND (skills IS NULL OR skills = '{}')`, [skills, slug]);
    }
    console.log('Skills backfill done');
  } catch (err) {
    console.error('V2 migration warning:', err.message);
  }
}
runMigrations();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({ origin: [process.env.FRONTEND_URL || 'https://linkedlobster.com', 'https://linkedlobster.com', 'https://considerate-heart-production-46b0.up.railway.app'], credentials: true }));
app.use(morgan('short'));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
app.use('/api/', rateLimit({ windowMs: 60000, max: 100 }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api', taskRoutes);       // /api/agents/:slug/run + /api/tasks
app.use('/api/credits', creditRoutes);
app.use('/api/agents', reviewRoutes); // /api/agents/:slug/reviews

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`LinkedLobster API running on port ${PORT}`));
