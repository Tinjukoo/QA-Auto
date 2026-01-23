import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';

const router = express.Router();

// Get all suites
router.get('/', (req, res) => {
  const db = getDb();
  const suites = db.prepare(`
    SELECT
      s.*,
      COUNT(t.id) as test_count
    FROM test_suites s
    LEFT JOIN tests t ON t.suite_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all();

  res.json(suites);
});

// Get single suite with tests
router.get('/:id', (req, res) => {
  const db = getDb();
  const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id);

  if (!suite) {
    return res.status(404).json({ error: 'Suite not found' });
  }

  const tests = db.prepare('SELECT * FROM tests WHERE suite_id = ? ORDER BY created_at DESC').all(req.params.id);

  suite.tests = tests.map(test => ({
    ...test,
    steps: JSON.parse(test.steps || '[]')
  }));

  res.json(suite);
});

// Create new suite
router.post('/', (req, res) => {
  const db = getDb();
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const id = uuidv4();

  db.prepare(`
    INSERT INTO test_suites (id, name, description)
    VALUES (?, ?, ?)
  `).run(id, name, description || null);

  const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(id);
  suite.test_count = 0;

  res.status(201).json(suite);
});

// Update suite
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, description } = req.body;

  const existing = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Suite not found' });
  }

  db.prepare(`
    UPDATE test_suites
    SET name = ?, description = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name || existing.name,
    description !== undefined ? description : existing.description,
    req.params.id
  );

  const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id);
  res.json(suite);
});

// Delete suite
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM test_suites WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Suite not found' });
  }

  res.json({ message: 'Suite deleted successfully' });
});

// Run all tests in suite
router.post('/:id/run', async (req, res) => {
  const db = getDb();
  const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id);

  if (!suite) {
    return res.status(404).json({ error: 'Suite not found' });
  }

  const tests = db.prepare('SELECT id FROM tests WHERE suite_id = ?').all(req.params.id);

  if (tests.length === 0) {
    return res.status(400).json({ error: 'No tests in this suite' });
  }

  // Create run IDs for each test (actual execution happens via the runner)
  const runIds = tests.map(test => {
    const runId = uuidv4();
    db.prepare(`
      INSERT INTO test_runs (id, test_id, status)
      VALUES (?, ?, 'pending')
    `).run(runId, test.id);
    return { testId: test.id, runId };
  });

  res.json({
    message: 'Suite run initiated',
    suite_id: req.params.id,
    runs: runIds
  });
});

export default router;
