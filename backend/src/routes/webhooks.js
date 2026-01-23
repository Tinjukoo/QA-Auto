import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../db/database.js';

const router = express.Router();

// Available webhook events
const WEBHOOK_EVENTS = [
  'test.completed',
  'test.failed',
  'test.passed',
  'suite.completed',
  'visual.diff_detected',
  'schedule.triggered'
];

// Get all webhooks
router.get('/', (req, res) => {
  const db = getDb();
  const webhooks = db.prepare('SELECT * FROM webhooks ORDER BY created_at DESC').all();

  const parsed = webhooks.map(w => ({
    ...w,
    events: JSON.parse(w.events || '[]'),
    active: Boolean(w.active)
  }));

  res.json(parsed);
});

// Get available events
router.get('/events', (req, res) => {
  res.json(WEBHOOK_EVENTS);
});

// Get single webhook
router.get('/:id', (req, res) => {
  const db = getDb();
  const webhook = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(req.params.id);

  if (!webhook) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  webhook.events = JSON.parse(webhook.events || '[]');
  webhook.active = Boolean(webhook.active);

  res.json(webhook);
});

// Create webhook
router.post('/', (req, res) => {
  const db = getDb();
  const { name, url, events, secret } = req.body;

  if (!name || !url || !events) {
    return res.status(400).json({ error: 'name, url, and events are required' });
  }

  // Validate events
  const invalidEvents = events.filter(e => !WEBHOOK_EVENTS.includes(e));
  if (invalidEvents.length > 0) {
    return res.status(400).json({
      error: `Invalid events: ${invalidEvents.join(', ')}`,
      valid_events: WEBHOOK_EVENTS
    });
  }

  const id = uuidv4();
  const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

  db.prepare(`
    INSERT INTO webhooks (id, name, url, events, secret, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(id, name, url, JSON.stringify(events), webhookSecret);

  const webhook = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(id);
  webhook.events = JSON.parse(webhook.events);
  webhook.active = Boolean(webhook.active);

  res.status(201).json(webhook);
});

// Update webhook
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, url, events, active } = req.body;

  const existing = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  // Validate events if provided
  if (events) {
    const invalidEvents = events.filter(e => !WEBHOOK_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        error: `Invalid events: ${invalidEvents.join(', ')}`,
        valid_events: WEBHOOK_EVENTS
      });
    }
  }

  db.prepare(`
    UPDATE webhooks
    SET name = ?, url = ?, events = ?, active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name || existing.name,
    url || existing.url,
    events ? JSON.stringify(events) : existing.events,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    req.params.id
  );

  const webhook = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(req.params.id);
  webhook.events = JSON.parse(webhook.events);
  webhook.active = Boolean(webhook.active);

  res.json(webhook);
});

// Delete webhook
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM webhooks WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  res.json({ message: 'Webhook deleted successfully' });
});

// Test webhook
router.post('/:id/test', async (req, res) => {
  const db = getDb();
  const webhook = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(req.params.id);

  if (!webhook) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  const testPayload = {
    event: 'test.ping',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook from QA Automation',
      webhook_id: webhook.id,
      webhook_name: webhook.name
    }
  };

  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(JSON.stringify(testPayload))
    .digest('hex');

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-QA-Signature': signature,
        'X-QA-Event': 'test.ping'
      },
      body: JSON.stringify(testPayload)
    });

    res.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
