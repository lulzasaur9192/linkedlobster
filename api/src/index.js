import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

import authRoutes from './routes/auth.js';
import agentRoutes from './routes/agents.js';
import taskRoutes from './routes/tasks.js';
import creditRoutes from './routes/credits.js';
import reviewRoutes from './routes/reviews.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
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
