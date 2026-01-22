import 'dotenv/config';
import { takeScreenshot } from './screenshot.js';

const QA_WEBHOOK_URL = process.env.QA_WEBHOOK_URL || 'https://luckie.app.n8n.cloud/webhook/qa-screenshot';

/**
 * Sends screenshot data to the QA webhook
 * @param {Object} data - Data to send to webhook
 * @param {string} data.url - The URL that was screenshotted
 * @param {Buffer} data.screenshot - Screenshot buffer
 * @param {Object} [data.metadata] - Additional metadata
 * @returns {Promise<Object>} - Webhook response
 */
export async function sendToWebhook(data) {
  const payload = {
    url: data.url,
    screenshot: data.screenshot.toString('base64'),
    timestamp: new Date().toISOString(),
    metadata: data.metadata || {},
  };

  const response = await fetch(QA_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Webhook error (${response.status}): ${errorText}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return { success: true, status: response.status };
}

/**
 * Takes a screenshot and sends it to the QA webhook
 * @param {Object} options - Screenshot options (same as takeScreenshot)
 * @param {string} options.url - The URL to screenshot
 * @param {Object} [options.viewport] - Viewport settings
 * @param {boolean} [options.fullPage] - Whether to capture full page
 * @param {string} [options.type] - Image type (png or jpeg)
 * @param {number} [options.quality] - Image quality (1-100, only for jpeg)
 * @param {number} [options.waitForTimeout] - Wait time in ms before screenshot
 * @param {string} [options.waitForSelector] - CSS selector to wait for
 * @param {Object} [options.metadata] - Additional metadata to send with webhook
 * @returns {Promise<Object>} - Webhook response
 */
export async function screenshotAndSend(options) {
  const screenshot = await takeScreenshot(options);

  const webhookResponse = await sendToWebhook({
    url: options.url,
    screenshot,
    metadata: {
      ...options.metadata,
      viewport: options.viewport,
      fullPage: options.fullPage,
      type: options.type || 'png',
    },
  });

  return {
    webhookResponse,
    screenshot,
  };
}

/**
 * Takes multiple screenshots and sends them all to the webhook
 * @param {Array<Object>} screenshotConfigs - Array of screenshot configurations
 * @returns {Promise<Array<Object>>} - Array of webhook responses
 */
export async function screenshotMultipleAndSend(screenshotConfigs) {
  const results = [];
  for (const config of screenshotConfigs) {
    const result = await screenshotAndSend(config);
    results.push(result);
  }
  return results;
}

// CLI usage
if (process.argv[1] && process.argv[1].endsWith('webhook.js')) {
  const url = process.argv[2];
  const metadata = process.argv[3] ? JSON.parse(process.argv[3]) : {};

  if (!url) {
    console.error('Usage: node src/webhook.js <url> [metadata-json]');
    console.error('Example: node src/webhook.js https://example.com \'{"testName":"homepage"}\'');
    process.exit(1);
  }

  screenshotAndSend({ url, metadata })
    .then((result) => {
      console.log('Screenshot captured and sent to webhook successfully!');
      console.log('Webhook response:', JSON.stringify(result.webhookResponse, null, 2));
    })
    .catch((error) => {
      console.error('Failed:', error.message);
      process.exit(1);
    });
}
