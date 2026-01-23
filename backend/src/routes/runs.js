import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import { runTest } from '../../runner/executor.js';
import { triggerWebhooks } from '../services/webhookService.js';

const router = express.Router();

// Get all runs with pagination
router.get('/', (req, res) => {
  const db = getDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { status, test_id } = req.query;

  let query = `
    SELECT r.*, t.name as test_name
    FROM test_runs r
    JOIN tests t ON r.test_id = t.id
  `;
  const params = [];
  const conditions = [];

  if (status) {
    conditions.push('r.status = ?');
    params.push(status);
  }

  if (test_id) {
    conditions.push('r.test_id = ?');
    params.push(test_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const runs = db.prepare(query).all(...params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM test_runs r';
  if (conditions.length > 0) {
    countQuery += ' WHERE ' + conditions.join(' AND ');
  }
  const total = db.prepare(countQuery).get(...params.slice(0, -2))?.count || 0;

  const parsedRuns = runs.map(run => ({
    ...run,
    results: JSON.parse(run.results || '[]'),
    screenshots: JSON.parse(run.screenshots || '[]')
  }));

  res.json({
    runs: parsedRuns,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// Get single run with details
router.get('/:id', (req, res) => {
  const db = getDb();
  const run = db.prepare(`
    SELECT r.*, t.name as test_name, t.steps as test_steps
    FROM test_runs r
    JOIN tests t ON r.test_id = t.id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }

  // Get step results
  const stepResults = db.prepare(`
    SELECT * FROM step_results WHERE run_id = ? ORDER BY step_index
  `).all(req.params.id);

  run.results = JSON.parse(run.results || '[]');
  run.screenshots = JSON.parse(run.screenshots || '[]');
  run.test_steps = JSON.parse(run.test_steps || '[]');
  run.step_results = stepResults;

  res.json(run);
});

// Create and execute a new run
router.post('/', async (req, res) => {
  const db = getDb();
  const { test_id, options = {} } = req.body;

  if (!test_id) {
    return res.status(400).json({ error: 'test_id is required' });
  }

  const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(test_id);
  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  const runId = uuidv4();

  // Create the run record
  db.prepare(`
    INSERT INTO test_runs (id, test_id, status, started_at)
    VALUES (?, ?, 'running', datetime('now'))
  `).run(runId, test_id);

  // Return immediately, run test in background
  res.status(201).json({
    id: runId,
    test_id,
    status: 'running',
    message: 'Test run started'
  });

  // Execute test asynchronously
  try {
    const result = await runTest(test, runId, options);

    // Update run with results
    db.prepare(`
      UPDATE test_runs
      SET status = ?, completed_at = datetime('now'), duration_ms = ?,
          results = ?, screenshots = ?, error_message = ?
      WHERE id = ?
    `).run(
      result.status,
      result.duration,
      JSON.stringify(result.stepResults),
      JSON.stringify(result.screenshots),
      result.error || null,
      runId
    );

    // Trigger webhooks
    await triggerWebhooks('test.completed', {
      run_id: runId,
      test_id,
      test_name: test.name,
      status: result.status,
      duration_ms: result.duration,
      step_results: result.stepResults,
      screenshots: result.screenshots,
      error: result.error
    });

  } catch (error) {
    db.prepare(`
      UPDATE test_runs
      SET status = 'error', completed_at = datetime('now'), error_message = ?
      WHERE id = ?
    `).run(error.message, runId);

    await triggerWebhooks('test.failed', {
      run_id: runId,
      test_id,
      test_name: test.name,
      status: 'error',
      error: error.message
    });
  }
});

// Rerun a test
router.post('/:id/rerun', async (req, res) => {
  const db = getDb();
  const originalRun = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(req.params.id);

  if (!originalRun) {
    return res.status(404).json({ error: 'Run not found' });
  }

  // Trigger a new run for the same test
  req.body = { test_id: originalRun.test_id };
  return router.handle(req, res);
});

// Cancel a running test
router.post('/:id/cancel', (req, res) => {
  const db = getDb();
  const run = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(req.params.id);

  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }

  if (run.status !== 'running' && run.status !== 'pending') {
    return res.status(400).json({ error: 'Can only cancel running or pending tests' });
  }

  db.prepare(`
    UPDATE test_runs
    SET status = 'cancelled', completed_at = datetime('now')
    WHERE id = ?
  `).run(req.params.id);

  res.json({ message: 'Run cancelled', id: req.params.id });
});

// Get run statistics
router.get('/stats/summary', (req, res) => {
  const db = getDb();
  const { days = 7 } = req.query;

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_runs,
      SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
      AVG(duration_ms) as avg_duration
    FROM test_runs
    WHERE created_at >= datetime('now', '-' || ? || ' days')
  `).get(days);

  const dailyStats = db.prepare(`
    SELECT
      date(created_at) as date,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM test_runs
    WHERE created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY date(created_at)
    ORDER BY date DESC
  `).all(days);

  res.json({
    summary: stats,
    daily: dailyStats
  });
});

export default router;
