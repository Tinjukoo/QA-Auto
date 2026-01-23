import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'qa-auto.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Default data structure
const defaultData = {
  test_suites: [],
  tests: [],
  test_runs: [],
  step_results: [],
  webhooks: [],
  schedules: [],
  visual_baselines: []
};

// Initialize lowdb with synchronous adapter
const adapter = new JSONFileSync(dbPath);
const db = new LowSync(adapter, defaultData);

// Load data at startup
db.read();
if (!db.data) {
  db.data = defaultData;
  db.write();
}

// Helper to get current datetime
function now() {
  return new Date().toISOString();
}

// Simple SQL-like query interface that mimics better-sqlite3
class QueryBuilder {
  constructor(sql) {
    this.sql = sql;
    this.operation = this.parseOperation(sql);
  }

  parseOperation(sql) {
    const normalized = sql.trim().toLowerCase();
    if (normalized.startsWith('select')) return 'select';
    if (normalized.startsWith('insert')) return 'insert';
    if (normalized.startsWith('update')) return 'update';
    if (normalized.startsWith('delete')) return 'delete';
    return 'unknown';
  }

  // Extract table name from SQL
  getTable(sql) {
    const normalized = sql.toLowerCase();
    let match;

    if (normalized.includes('from')) {
      match = sql.match(/from\s+(\w+)/i);
    } else if (normalized.includes('into')) {
      match = sql.match(/into\s+(\w+)/i);
    } else if (normalized.includes('update')) {
      match = sql.match(/update\s+(\w+)/i);
    }

    return match ? match[1] : null;
  }

  all(...params) {
    if (this.operation !== 'select') return [];

    const table = this.getTable(this.sql);
    if (!table || !db.data[table]) return [];

    let results = [...db.data[table]];
    let paramIdx = 0;

    // Apply WHERE filtering
    if (this.sql.toLowerCase().includes('where')) {
      const whereMatch = this.sql.match(/where\s+(.+?)(?:\s+order|\s+limit|\s+group|$)/i);
      if (whereMatch) {
        const conditions = whereMatch[1];
        results = results.filter(item => {
          let localParamIdx = paramIdx;
          const parts = conditions.split(/\s+and\s+/i);

          const matches = parts.every(part => {
            const eqMatch = part.match(/(\w+(?:\.\w+)?)\s*=\s*\?/i);
            if (eqMatch) {
              const field = eqMatch[1].split('.').pop();
              const value = params[localParamIdx++];
              return item[field] == value;
            }
            return true;
          });

          return matches;
        });
        // Count how many ? in WHERE clause
        const whereParamCount = (conditions.match(/\?/g) || []).length;
        paramIdx += whereParamCount;
      }
    }

    // Handle JOINs (simplified - just add joined data)
    if (this.sql.toLowerCase().includes('join')) {
      const joinMatch = this.sql.match(/join\s+(\w+)\s+(\w+)\s+on\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/i);
      if (joinMatch) {
        const joinTable = joinMatch[1];
        const leftTable = joinMatch[3];
        const leftField = joinMatch[4];
        const rightField = joinMatch[6];

        results = results.map(item => {
          const joinData = db.data[joinTable];
          if (!joinData) return item;

          const joined = joinData.find(j => j[rightField] === item[leftField]);
          if (joined) {
            const result = { ...item };
            if (joinTable === 'tests') {
              result.test_name = joined.name;
              result.test_steps = joined.steps;
            }
            return result;
          }
          return null;
        }).filter(Boolean);
      }
    }

    // Handle ORDER BY
    const orderMatch = this.sql.match(/order\s+by\s+(\w+(?:\.\w+)?)\s*(desc|asc)?/i);
    if (orderMatch) {
      const field = orderMatch[1].split('.').pop();
      const desc = orderMatch[2]?.toLowerCase() === 'desc';
      results.sort((a, b) => {
        const aVal = a[field] || '';
        const bVal = b[field] || '';
        if (aVal < bVal) return desc ? 1 : -1;
        if (aVal > bVal) return desc ? -1 : 1;
        return 0;
      });
    }

    // Handle LIMIT and OFFSET
    const limitMatch = this.sql.match(/limit\s+(\?|\d+)/i);
    if (limitMatch) {
      let limitVal, offsetVal = 0;

      if (limitMatch[1] === '?') {
        // Find the position of LIMIT ? in the params
        const beforeLimit = this.sql.substring(0, this.sql.toLowerCase().indexOf('limit')).match(/\?/g) || [];
        limitVal = params[beforeLimit.length] || 20;
      } else {
        limitVal = parseInt(limitMatch[1]);
      }

      const offsetMatch = this.sql.match(/offset\s+(\?|\d+)/i);
      if (offsetMatch) {
        if (offsetMatch[1] === '?') {
          const beforeOffset = this.sql.substring(0, this.sql.toLowerCase().indexOf('offset')).match(/\?/g) || [];
          offsetVal = params[beforeOffset.length] || 0;
        } else {
          offsetVal = parseInt(offsetMatch[1]);
        }
      }

      results = results.slice(offsetVal, offsetVal + limitVal);
    }

    return results;
  }

  get(...params) {
    // For COUNT queries, return a special object
    if (this.sql.toLowerCase().includes('count(*)')) {
      const table = this.getTable(this.sql);
      if (!table || !db.data[table]) return { count: 0 };

      let items = [...db.data[table]];

      // Apply WHERE filtering if present
      if (this.sql.toLowerCase().includes('where')) {
        const whereMatch = this.sql.match(/where\s+(.+?)$/i);
        if (whereMatch) {
          const conditions = whereMatch[1];
          let paramIdx = 0;
          items = items.filter(item => {
            const parts = conditions.split(/\s+and\s+/i);
            return parts.every(part => {
              const eqMatch = part.match(/(\w+(?:\.\w+)?)\s*=\s*\?/i);
              if (eqMatch) {
                const field = eqMatch[1].split('.').pop();
                const value = params[paramIdx++];
                return item[field] == value;
              }
              return true;
            });
          });
        }
      }

      return { count: items.length };
    }

    // For aggregate queries (stats), handle specially
    if (this.sql.toLowerCase().includes('sum(') || this.sql.toLowerCase().includes('avg(')) {
      const table = this.getTable(this.sql);
      if (!table || !db.data[table]) {
        return { total_runs: 0, passed: 0, failed: 0, errors: 0, avg_duration: 0 };
      }

      let items = [...db.data[table]];

      // Filter by date if specified
      const daysMatch = this.sql.match(/datetime\('now',\s*'-'\s*\|\|\s*\?\s*\|\|\s*'\s*days'\)/i);
      if (daysMatch && params.length > 0) {
        const days = params[0];
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        items = items.filter(item => new Date(item.created_at) >= cutoff);
      }

      return {
        total_runs: items.length,
        passed: items.filter(i => i.status === 'passed').length,
        failed: items.filter(i => i.status === 'failed').length,
        errors: items.filter(i => i.status === 'error').length,
        avg_duration: items.length > 0 ? items.reduce((sum, i) => sum + (i.duration_ms || 0), 0) / items.length : 0
      };
    }

    const results = this.all(...params);
    return results[0] || null;
  }

  run(...params) {
    let changes = 0;
    const table = this.getTable(this.sql);

    if (this.operation === 'insert') {
      const item = this.parseInsert(params);
      if (table && db.data[table]) {
        db.data[table].push(item);
        changes = 1;
        db.write();
      }
    } else if (this.operation === 'update') {
      if (table && db.data[table]) {
        const updates = this.parseUpdate(params);

        db.data[table] = db.data[table].map(item => {
          if (this.matchesWhere(item, params)) {
            changes++;
            return { ...item, ...updates };
          }
          return item;
        });
        db.write();
      }
    } else if (this.operation === 'delete') {
      if (table && db.data[table]) {
        const initialLength = db.data[table].length;
        db.data[table] = db.data[table].filter(item => !this.matchesWhere(item, params));
        changes = initialLength - db.data[table].length;
        db.write();
      }
    }

    return { changes };
  }

  parseInsert(params) {
    // Extract column names from INSERT statement
    const colMatch = this.sql.match(/\(([^)]+)\)\s*values/i);
    if (!colMatch) return {};

    const columns = colMatch[1].split(',').map(c => c.trim());
    const item = {};

    columns.forEach((col, idx) => {
      if (params[idx] !== undefined) {
        item[col] = params[idx];
      }
    });

    // Handle datetime('now') defaults
    if (!item.created_at) item.created_at = now();
    if (!item.updated_at) item.updated_at = now();

    return item;
  }

  parseUpdate(params) {
    // Extract SET assignments
    const setMatch = this.sql.match(/set\s+(.+?)(?:\s+where|$)/i);
    if (!setMatch) return {};

    const setPart = setMatch[1];
    const updates = {};
    let paramIdx = 0;

    // Split by comma but be careful with functions
    const assignments = [];
    let current = '';
    let parenDepth = 0;

    for (const char of setPart) {
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
      if (char === ',' && parenDepth === 0) {
        assignments.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) assignments.push(current.trim());

    assignments.forEach(assignment => {
      const eqIdx = assignment.indexOf('=');
      if (eqIdx === -1) return;

      const col = assignment.substring(0, eqIdx).trim();
      const val = assignment.substring(eqIdx + 1).trim();

      if (val === '?') {
        updates[col] = params[paramIdx++];
      } else if (val.toLowerCase().includes("datetime('now')")) {
        updates[col] = now();
      }
    });

    return updates;
  }

  matchesWhere(item, params) {
    const whereMatch = this.sql.match(/where\s+(.+?)$/i);
    if (!whereMatch) return true;

    const wherePart = whereMatch[1];

    // Count params before WHERE
    const beforeWhere = this.sql.substring(0, this.sql.toLowerCase().indexOf('where'));
    const paramsBefore = (beforeWhere.match(/\?/g) || []).length;

    // Simple ID matching
    const idMatch = wherePart.match(/(\w+)\s*=\s*\?/);
    if (idMatch) {
      const field = idMatch[1];
      const value = params[paramsBefore];
      return item[field] == value;
    }

    return true;
  }
}

// SQLite-compatible interface
const dbInterface = {
  prepare(sql) {
    return new QueryBuilder(sql);
  },

  exec(sql) {
    // exec is used for CREATE TABLE statements - we ignore these with JSON storage
    return;
  },

  pragma() {
    // No-op for JSON storage
    return;
  }
};

export function getDb() {
  return dbInterface;
}

export function initDatabase() {
  db.read();
  if (!db.data) {
    db.data = defaultData;
    db.write();
  }
  console.log('Database initialized successfully (JSON storage)');
  return dbInterface;
}

export default { getDb, initDatabase };
