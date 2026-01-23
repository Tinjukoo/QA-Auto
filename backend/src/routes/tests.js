import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';

const router = express.Router();

// Get all tests
router.get('/', (req, res) => {
  const db = getDb();
  const { suite_id, status } = req.query;

  let query = 'SELECT * FROM tests';
  const params = [];
  const conditions = [];

  if (suite_id) {
    conditions.push('suite_id = ?');
    params.push(suite_id);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  const tests = db.prepare(query).all(...params);

  // Parse JSON steps for each test
  const parsedTests = tests.map(test => ({
    ...test,
    steps: typeof test.steps === 'string' ? JSON.parse(test.steps || '[]') : (test.steps || [])
  }));

  res.json({ tests: parsedTests });
});

// Get single test
router.get('/:id', (req, res) => {
  const db = getDb();
  const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(req.params.id);

  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  test.steps = typeof test.steps === 'string' ? JSON.parse(test.steps || '[]') : (test.steps || []);
  res.json(test);
});

// Create new test
router.post('/', (req, res) => {
  const db = getDb();
  const { name, description, base_url, steps, suite_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const id = uuidv4();
  const stepsJson = JSON.stringify(steps || []);

  db.prepare(`
    INSERT INTO tests (id, name, description, base_url, steps, suite_id, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).run(id, name, description || null, base_url || null, stepsJson, suite_id || null);

  const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(id);
  test.steps = typeof test.steps === 'string' ? JSON.parse(test.steps) : test.steps;

  res.status(201).json({ test });
});

// Update test
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, description, base_url, steps, suite_id, status } = req.body;

  const existing = db.prepare('SELECT * FROM tests WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Test not found' });
  }

  const existingSteps = typeof existing.steps === 'string' ? existing.steps : JSON.stringify(existing.steps);
  const stepsJson = steps ? JSON.stringify(steps) : existingSteps;

  db.prepare(`
    UPDATE tests
    SET name = ?, description = ?, base_url = ?, steps = ?, suite_id = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name || existing.name,
    description !== undefined ? description : existing.description,
    base_url !== undefined ? base_url : existing.base_url,
    stepsJson,
    suite_id !== undefined ? suite_id : existing.suite_id,
    status || existing.status,
    req.params.id
  );

  const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(req.params.id);
  test.steps = typeof test.steps === 'string' ? JSON.parse(test.steps) : test.steps;

  res.json(test);
});

// Delete test
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM tests WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Test not found' });
  }

  res.json({ message: 'Test deleted successfully' });
});

// Duplicate test
router.post('/:id/duplicate', (req, res) => {
  const db = getDb();
  const original = db.prepare('SELECT * FROM tests WHERE id = ?').get(req.params.id);

  if (!original) {
    return res.status(404).json({ error: 'Test not found' });
  }

  const id = uuidv4();
  const newName = `${original.name} (Copy)`;
  const originalSteps = typeof original.steps === 'string' ? original.steps : JSON.stringify(original.steps);

  db.prepare(`
    INSERT INTO tests (id, name, description, base_url, steps, suite_id, status)
    VALUES (?, ?, ?, ?, ?, ?, 'draft')
  `).run(id, newName, original.description, original.base_url, originalSteps, original.suite_id);

  const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(id);
  test.steps = typeof test.steps === 'string' ? JSON.parse(test.steps) : test.steps;

  res.status(201).json(test);
});

// Get test run history
router.get('/:id/runs', (req, res) => {
  const db = getDb();
  const limit = parseInt(req.query.limit) || 20;

  const runs = db.prepare(`
    SELECT * FROM test_runs
    WHERE test_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(req.params.id, limit);

  const parsedRuns = runs.map(run => ({
    ...run,
    results: typeof run.results === 'string' ? JSON.parse(run.results || '[]') : (run.results || []),
    screenshots: typeof run.screenshots === 'string' ? JSON.parse(run.screenshots || '[]') : (run.screenshots || [])
  }));

  res.json(parsedRuns);
});

export default router;
