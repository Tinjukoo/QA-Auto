import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import testsRouter from './routes/tests.js';
import suitesRouter from './routes/suites.js';
import runsRouter from './routes/runs.js';
import webhooksRouter from './routes/webhooks.js';
import schedulesRouter from './routes/schedules.js';

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Serve screenshots
app.use('/screenshots', express.static('../screenshots'));
app.use('/reports', express.static('../reports'));

// Initialize database
initDatabase();

// API Routes
app.use('/api/tests', testsRouter);
app.use('/api/suites', suitesRouter);
app.use('/api/runs', runsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/schedules', schedulesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`QA Automation Backend running on http://localhost:${PORT}`);
});

export default app;
