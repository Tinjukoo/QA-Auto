import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const BROWSERLESS_URL = process.env.BROWSERLESS_URL || 'https://production-sfo.browserless.io/screenshot';
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;

/**
 * Takes a screenshot of a webpage using Browserless.io API
 * @param {Object} options - Screenshot options
 * @param {string} options.url - The URL to screenshot
 * @param {string} [options.outputPath] - Path to save the screenshot (optional)
 * @param {Object} [options.viewport] - Viewport settings
 * @param {number} [options.viewport.width=1920] - Viewport width
 * @param {number} [options.viewport.height=1080] - Viewport height
 * @param {boolean} [options.fullPage=false] - Whether to capture full page
 * @param {string} [options.type='png'] - Image type (png or jpeg)
 * @param {number} [options.quality] - Image quality (1-100, only for jpeg)
 * @param {number} [options.waitForTimeout] - Wait time in ms before screenshot
 * @param {string} [options.waitForSelector] - CSS selector to wait for before screenshot
 * @returns {Promise<Buffer>} - Screenshot buffer
 */
export async function takeScreenshot(options) {
  if (!BROWSERLESS_TOKEN) {
    throw new Error('BROWSERLESS_TOKEN environment variable is required');
  }

  if (!options.url) {
    throw new Error('URL is required');
  }

  const apiUrl = `${BROWSERLESS_URL}?token=${BROWSERLESS_TOKEN}`;

  const requestBody = {
    url: options.url,
    options: {
      type: options.type || 'png',
      fullPage: options.fullPage || false,
    },
    viewport: {
      width: options.viewport?.width || 1920,
      height: options.viewport?.height || 1080,
    },
  };

  if (options.quality && options.type === 'jpeg') {
    requestBody.options.quality = options.quality;
  }

  if (options.waitForTimeout) {
    requestBody.waitForTimeout = options.waitForTimeout;
  }

  if (options.waitForSelector) {
    requestBody.waitForSelector = {
      selector: options.waitForSelector,
    };
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Screenshot API error (${response.status}): ${errorText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (options.outputPath) {
    const outputDir = path.dirname(options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(options.outputPath, buffer);
    console.log(`Screenshot saved to: ${options.outputPath}`);
  }

  return buffer;
}

/**
 * Takes multiple screenshots in sequence
 * @param {Array<Object>} screenshotConfigs - Array of screenshot configurations
 * @returns {Promise<Array<Buffer>>} - Array of screenshot buffers
 */
export async function takeMultipleScreenshots(screenshotConfigs) {
  const results = [];
  for (const config of screenshotConfigs) {
    const screenshot = await takeScreenshot(config);
    results.push(screenshot);
  }
  return results;
}

// CLI usage
if (process.argv[1] && process.argv[1].endsWith('screenshot.js')) {
  const url = process.argv[2];
  const outputPath = process.argv[3] || './screenshots/screenshot.png';

  if (!url) {
    console.error('Usage: node src/screenshot.js <url> [output-path]');
    console.error('Example: node src/screenshot.js https://example.com ./screenshots/example.png');
    process.exit(1);
  }

  takeScreenshot({ url, outputPath })
    .then(() => {
      console.log('Screenshot completed successfully!');
    })
    .catch((error) => {
      console.error('Screenshot failed:', error.message);
      process.exit(1);
    });
}
