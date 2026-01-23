import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';

const router = express.Router();

// Get all schedules
router.get('/', (req, res) => {
  const db = getDb();
  const schedules = db.prepare(`
    SELECT
      s.*,
      t.name as test_name,
      ts.name as suite_name
    FROM schedules s
    LEFT JOIN tests t ON s.test_id = t.id
    LEFT JOIN test_suites ts ON s.suite_id = ts.id
    ORDER BY s.created_at DESC
  `).all();

  const parsed = schedules.map(s => ({
    ...s,
    active: Boolean(s.active)
  }));

  res.json(parsed);
});

// Get single schedule
router.get('/:id', (req, res) => {
  const db = getDb();
  const schedule = db.prepare(`
    SELECT
      s.*,
      t.name as test_name,
      ts.name as suite_name
    FROM schedules s
    LEFT JOIN tests t ON s.test_id = t.id
    LEFT JOIN test_suites ts ON s.suite_id = ts.id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!schedule) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  schedule.active = Boolean(schedule.active);
  res.json(schedule);
});

// Create schedule
router.post('/', (req, res) => {
  const db = getDb();
  const { test_id, suite_id, cron_expression, timezone } = req.body;

  if (!cron_expression) {
    return res.status(400).json({ error: 'cron_expression is required' });
  }

  if (!test_id && !suite_id) {
    return res.status(400).json({ error: 'Either test_id or suite_id is required' });
  }

  // Validate test or suite exists
  if (test_id) {
    const test = db.prepare('SELECT id FROM tests WHERE id = ?').get(test_id);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
  }

  if (suite_id) {
    const suite = db.prepare('SELECT id FROM test_suites WHERE id = ?').get(suite_id);
    if (!suite) {
      return res.status(404).json({ error: 'Suite not found' });
    }
  }

  const id = uuidv4();
  const nextRun = calculateNextRun(cron_expression, timezone || 'UTC');

  db.prepare(`
    INSERT INTO schedules (id, test_id, suite_id, cron_expression, timezone, next_run_at, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(id, test_id || null, suite_id || null, cron_expression, timezone || 'UTC', nextRun);

  const schedule = db.prepare(`
    SELECT
      s.*,
      t.name as test_name,
      ts.name as suite_name
    FROM schedules s
    LEFT JOIN tests t ON s.test_id = t.id
    LEFT JOIN test_suites ts ON s.suite_id = ts.id
    WHERE s.id = ?
  `).get(id);

  schedule.active = Boolean(schedule.active);
  res.status(201).json(schedule);
});

// Update schedule
router.put('/:id', (req, res) => {
  const db = getDb();
  const { cron_expression, timezone, active } = req.body;

  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  const newCron = cron_expression || existing.cron_expression;
  const newTimezone = timezone || existing.timezone;
  const nextRun = calculateNextRun(newCron, newTimezone);

  db.prepare(`
    UPDATE schedules
    SET cron_expression = ?, timezone = ?, active = ?, next_run_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    newCron,
    newTimezone,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    nextRun,
    req.params.id
  );

  const schedule = db.prepare(`
    SELECT
      s.*,
      t.name as test_name,
      ts.name as suite_name
    FROM schedules s
    LEFT JOIN tests t ON s.test_id = t.id
    LEFT JOIN test_suites ts ON s.suite_id = ts.id
    WHERE s.id = ?
  `).get(req.params.id);

  schedule.active = Boolean(schedule.active);
  res.json(schedule);
});

// Delete schedule
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  res.json({ message: 'Schedule deleted successfully' });
});

// Trigger schedule manually
router.post('/:id/trigger', async (req, res) => {
  const db = getDb();
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);

  if (!schedule) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  // Update last run time
  db.prepare(`
    UPDATE schedules SET last_run_at = datetime('now'), next_run_at = ?
    WHERE id = ?
  `).run(
    calculateNextRun(schedule.cron_expression, schedule.timezone),
    req.params.id
  );

  res.json({
    message: 'Schedule triggered',
    schedule_id: schedule.id,
    test_id: schedule.test_id,
    suite_id: schedule.suite_id
  });
});

// Simple cron next run calculator
function calculateNextRun(cronExpression, timezone) {
  // Simplified - just return 1 hour from now for basic schedules
  // In production, use a proper cron parser library
  const next = new Date();
  next.setHours(next.getHours() + 1);
  return next.toISOString();
}

export default router;
