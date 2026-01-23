import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';

const router = express.Router();

// Get all schedules
router.get('/', (req, res) => {
  const db = getDb();
  const schedules = db.prepare(`
    SELECT * FROM schedules ORDER BY created_at DESC
  `).all();

  // Enrich with test/suite names
  const enriched = schedules.map(s => {
    const result = { ...s, active: Boolean(s.active) };

    if (s.test_id) {
      const test = db.prepare('SELECT name FROM tests WHERE id = ?').get(s.test_id);
      result.test_name = test?.name || null;
    }

    if (s.suite_id) {
      const suite = db.prepare('SELECT name FROM test_suites WHERE id = ?').get(s.suite_id);
      result.suite_name = suite?.name || null;
    }

    return result;
  });

  res.json(enriched);
});

// Get single schedule
router.get('/:id', (req, res) => {
  const db = getDb();
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);

  if (!schedule) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  schedule.active = Boolean(schedule.active);

  if (schedule.test_id) {
    const test = db.prepare('SELECT name FROM tests WHERE id = ?').get(schedule.test_id);
    schedule.test_name = test?.name || null;
  }

  if (schedule.suite_id) {
    const suite = db.prepare('SELECT name FROM test_suites WHERE id = ?').get(schedule.suite_id);
    schedule.suite_name = suite?.name || null;
  }

  res.json(schedule);
});

// Create schedule
router.post('/', (req, res) => {
  const db = getDb();
  const { test_id, suite_id, cron_expression, timezone, is_active } = req.body;

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
  const active = is_active !== undefined ? (is_active ? 1 : 0) : 1;

  db.prepare(`
    INSERT INTO schedules (id, test_id, suite_id, cron_expression, timezone, next_run_at, active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, test_id || null, suite_id || null, cron_expression, timezone || 'UTC', nextRun, active);

  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  schedule.active = Boolean(schedule.active);

  if (schedule.test_id) {
    const test = db.prepare('SELECT name FROM tests WHERE id = ?').get(schedule.test_id);
    schedule.test_name = test?.name || null;
  }

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
  const newActive = active !== undefined ? (active ? 1 : 0) : existing.active;

  db.prepare(`
    UPDATE schedules
    SET cron_expression = ?, timezone = ?, active = ?, next_run_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newCron, newTimezone, newActive, nextRun, req.params.id);

  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
  schedule.active = Boolean(schedule.active);

  if (schedule.test_id) {
    const test = db.prepare('SELECT name FROM tests WHERE id = ?').get(schedule.test_id);
    schedule.test_name = test?.name || null;
  }

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

  const nextRun = calculateNextRun(schedule.cron_expression, schedule.timezone);

  db.prepare(`
    UPDATE schedules SET last_run_at = datetime('now'), next_run_at = ?
    WHERE id = ?
  `).run(nextRun, req.params.id);

  res.json({
    message: 'Schedule triggered',
    schedule_id: schedule.id,
    test_id: schedule.test_id,
    suite_id: schedule.suite_id
  });
});

// Simple cron next run calculator
function calculateNextRun(cronExpression, timezone) {
  // Simplified - parse basic cron format and calculate next run
  const parts = cronExpression.split(' ');
  const next = new Date();

  if (parts.length >= 2) {
    const minute = parts[0] === '*' ? next.getMinutes() : parseInt(parts[0]);
    const hour = parts[1] === '*' ? next.getHours() : parseInt(parts[1]);

    next.setMinutes(minute);
    next.setHours(hour);

    // If time has passed today, schedule for tomorrow
    if (next <= new Date()) {
      next.setDate(next.getDate() + 1);
    }
  } else {
    // Default to 1 hour from now
    next.setHours(next.getHours() + 1);
  }

  return next.toISOString();
}

export default router;
