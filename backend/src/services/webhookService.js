import crypto from 'crypto';
import { getDb } from '../db/database.js';

/**
 * Trigger webhooks for a specific event
 * @param {string} event - The event type
 * @param {Object} data - The event data
 */
export async function triggerWebhooks(event, data) {
  const db = getDb();

  // Get all active webhooks that subscribe to this event
  const webhooks = db.prepare(`
    SELECT * FROM webhooks WHERE active = 1
  `).all();

  const matchingWebhooks = webhooks.filter(w => {
    const events = JSON.parse(w.events || '[]');
    return events.includes(event) || events.includes('*');
  });

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data
  };

  const results = await Promise.allSettled(
    matchingWebhooks.map(webhook => sendWebhook(webhook, payload))
  );

  return results.map((result, index) => ({
    webhook_id: matchingWebhooks[index].id,
    webhook_name: matchingWebhooks[index].name,
    success: result.status === 'fulfilled',
    error: result.status === 'rejected' ? result.reason?.message : null
  }));
}

/**
 * Send webhook request
 * @param {Object} webhook - Webhook configuration
 * @param {Object} payload - Payload to send
 */
async function sendWebhook(webhook, payload) {
  const payloadString = JSON.stringify(payload);

  const signature = crypto
    .createHmac('sha256', webhook.secret || '')
    .update(payloadString)
    .digest('hex');

  const response = await fetch(webhook.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-QA-Signature': signature,
      'X-QA-Event': payload.event,
      'X-QA-Timestamp': payload.timestamp
    },
    body: payloadString
  });

  if (!response.ok) {
    throw new Error(`Webhook failed with status ${response.status}`);
  }

  return {
    status: response.status,
    statusText: response.statusText
  };
}

/**
 * Send to n8n webhook specifically
 * @param {string} url - n8n webhook URL
 * @param {Object} data - Data to send
 */
export async function sendToN8n(url, data) {
  const payload = {
    timestamp: new Date().toISOString(),
    source: 'qa-automation',
    ...data
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`n8n webhook failed with status ${response.status}`);
  }

  return response;
}

export default { triggerWebhooks, sendToN8n };
