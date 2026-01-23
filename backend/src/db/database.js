import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/qa-auto.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initDatabase() {
  const db = getDb();

  // Test Suites table
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_suites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      suite_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      base_url TEXT,
      steps TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (suite_id) REFERENCES test_suites(id) ON DELETE SET NULL
    )
  `);

  // Test Runs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      started_at TEXT,
      completed_at TEXT,
      duration_ms INTEGER,
      error_message TEXT,
      results TEXT,
      screenshots TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
    )
  `);

  // Step Results table
  db.exec(`
    CREATE TABLE IF NOT EXISTS step_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      step_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      screenshot_path TEXT,
      baseline_screenshot_path TEXT,
      diff_screenshot_path TEXT,
      visual_diff_percent REAL,
      error_message TEXT,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE
    )
  `);

  // Webhooks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      events TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      secret TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Schedules table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      test_id TEXT,
      suite_id TEXT,
      cron_expression TEXT NOT NULL,
      timezone TEXT DEFAULT 'UTC',
      active INTEGER DEFAULT 1,
      last_run_at TEXT,
      next_run_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
      FOREIGN KEY (suite_id) REFERENCES test_suites(id) ON DELETE CASCADE
    )
  `);

  // Visual Baselines table
  db.exec(`
    CREATE TABLE IF NOT EXISTS visual_baselines (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      screenshot_path TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
      UNIQUE(test_id, step_index)
    )
  `);

  console.log('Database initialized successfully');
  return db;
}

export default { getDb, initDatabase };
