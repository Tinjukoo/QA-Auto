import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../src/db/database.js';
import { compareScreenshots } from './visualTesting.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '../../screenshots');
const BROWSERLESS_URL = process.env.BROWSERLESS_URL || 'https://production-sfo.browserless.io';
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Execute a test and return results
 * @param {Object} test - Test object with steps
 * @param {string} runId - The run ID
 * @param {Object} options - Run options
 */
export async function runTest(test, runId, options = {}) {
  const startTime = Date.now();
  const steps = JSON.parse(test.steps || '[]');
  const stepResults = [];
  const screenshots = [];
  let overallStatus = 'passed';
  let errorMessage = null;

  const db = getDb();

  console.log(`Starting test: ${test.name} (Run ID: ${runId})`);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepStartTime = Date.now();
    let stepStatus = 'passed';
    let stepError = null;
    let screenshotPath = null;
    let diffPercent = null;
    let diffPath = null;

    try {
      console.log(`  Step ${i + 1}/${steps.length}: ${step.type} - ${step.description || ''}`);

      // Execute the step using Browserless
      await executeStep(step, test.base_url, options);

      // Take screenshot after step (if enabled)
      if (step.takeScreenshot !== false) {
        const screenshotResult = await takeStepScreenshot(
          test.base_url,
          step,
          runId,
          i
        );
        screenshotPath = screenshotResult.path;
        screenshots.push({
          step_index: i,
          path: screenshotPath
        });

        // Visual comparison if baseline exists
        if (options.visualTesting !== false) {
          const baseline = db.prepare(`
            SELECT screenshot_path FROM visual_baselines
            WHERE test_id = ? AND step_index = ?
          `).get(test.id, i);

          if (baseline) {
            const comparison = await compareScreenshots(
              baseline.screenshot_path,
              screenshotPath,
              options.visualThreshold || 0.1
            );

            diffPercent = comparison.diffPercent;
            diffPath = comparison.diffPath;

            if (!comparison.match) {
              stepStatus = 'visual_diff';
              stepError = `Visual difference detected: ${(diffPercent * 100).toFixed(2)}%`;
              if (options.failOnVisualDiff) {
                overallStatus = 'failed';
              }
            }
          } else if (options.updateBaseline) {
            // Save as new baseline
            const baselineId = uuidv4();
            db.prepare(`
              INSERT OR REPLACE INTO visual_baselines (id, test_id, step_index, screenshot_path)
              VALUES (?, ?, ?, ?)
            `).run(baselineId, test.id, i, screenshotPath);
          }
        }
      }
    } catch (error) {
      stepStatus = 'failed';
      stepError = error.message;
      overallStatus = 'failed';
      errorMessage = error.message;

      // Retry logic
      if (options.retryCount && options.retryCount > 0) {
        for (let retry = 1; retry <= options.retryCount; retry++) {
          console.log(`  Retrying step ${i + 1} (attempt ${retry + 1})...`);
          try {
            await new Promise(r => setTimeout(r, options.retryDelay || 1000));
            await executeStep(step, test.base_url, options);
            stepStatus = 'passed';
            stepError = null;
            overallStatus = 'passed';
            errorMessage = null;
            break;
          } catch (retryError) {
            if (retry === options.retryCount) {
              stepStatus = 'failed';
              stepError = retryError.message;
            }
          }
        }
      }
    }

    const stepDuration = Date.now() - stepStartTime;

    // Save step result
    const stepResultId = uuidv4();
    db.prepare(`
      INSERT INTO step_results (id, run_id, step_index, step_type, status, screenshot_path,
                               diff_screenshot_path, visual_diff_percent, error_message, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      stepResultId, runId, i, step.type, stepStatus, screenshotPath,
      diffPath, diffPercent, stepError, stepDuration
    );

    stepResults.push({
      step_index: i,
      type: step.type,
      status: stepStatus,
      error: stepError,
      duration_ms: stepDuration,
      screenshot_path: screenshotPath,
      diff_percent: diffPercent
    });

    // Stop on failure if configured
    if (stepStatus === 'failed' && !options.continueOnFailure) {
      break;
    }
  }

  const totalDuration = Date.now() - startTime;
  console.log(`Test completed: ${overallStatus} (${totalDuration}ms)`);

  return {
    status: overallStatus,
    duration: totalDuration,
    stepResults,
    screenshots,
    error: errorMessage
  };
}

/**
 * Execute a single step using Browserless
 */
async function executeStep(step, baseUrl, options) {
  const functionUrl = `${BROWSERLESS_URL}/function?token=${BROWSERLESS_TOKEN}`;

  // Build the Playwright code based on step type
  const playwrightCode = buildPlaywrightCode(step, baseUrl);

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: playwrightCode,
      context: {
        step,
        baseUrl,
        options
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Step execution failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Build Playwright code for a step
 */
function buildPlaywrightCode(step, baseUrl) {
  const timeout = step.timeout || 30000;

  switch (step.type) {
    case 'navigate':
      return `
        export default async function({ page }) {
          await page.goto('${step.url || baseUrl}', { waitUntil: 'networkidle', timeout: ${timeout} });
          return { success: true };
        }
      `;

    case 'click':
      return `
        export default async function({ page }) {
          const selector = ${JSON.stringify(step.selector)};
          await page.waitForSelector(selector, { timeout: ${timeout} });
          await page.click(selector);
          return { success: true };
        }
      `;

    case 'type':
      return `
        export default async function({ page }) {
          const selector = ${JSON.stringify(step.selector)};
          await page.waitForSelector(selector, { timeout: ${timeout} });
          await page.fill(selector, ${JSON.stringify(step.value || '')});
          return { success: true };
        }
      `;

    case 'select':
      return `
        export default async function({ page }) {
          const selector = ${JSON.stringify(step.selector)};
          await page.waitForSelector(selector, { timeout: ${timeout} });
          await page.selectOption(selector, ${JSON.stringify(step.value)});
          return { success: true };
        }
      `;

    case 'hover':
      return `
        export default async function({ page }) {
          const selector = ${JSON.stringify(step.selector)};
          await page.waitForSelector(selector, { timeout: ${timeout} });
          await page.hover(selector);
          return { success: true };
        }
      `;

    case 'scroll':
      return `
        export default async function({ page }) {
          ${step.selector ? `
            const element = await page.$(${JSON.stringify(step.selector)});
            await element.scrollIntoViewIfNeeded();
          ` : `
            await page.evaluate(() => window.scrollBy(0, ${step.y || 500}));
          `}
          return { success: true };
        }
      `;

    case 'wait':
      return `
        export default async function({ page }) {
          ${step.selector ? `
            await page.waitForSelector(${JSON.stringify(step.selector)}, { timeout: ${timeout} });
          ` : `
            await page.waitForTimeout(${step.duration || 1000});
          `}
          return { success: true };
        }
      `;

    case 'assert':
      return `
        export default async function({ page }) {
          const selector = ${JSON.stringify(step.selector)};
          const element = await page.$(selector);

          if (!element) {
            throw new Error('Element not found: ' + selector);
          }

          ${step.assertType === 'text' ? `
            const text = await element.textContent();
            if (!text.includes(${JSON.stringify(step.expectedValue)})) {
              throw new Error('Text assertion failed. Expected: ${step.expectedValue}, Got: ' + text);
            }
          ` : ''}

          ${step.assertType === 'visible' ? `
            const isVisible = await element.isVisible();
            if (!isVisible) {
              throw new Error('Element is not visible: ' + selector);
            }
          ` : ''}

          ${step.assertType === 'attribute' ? `
            const attrValue = await element.getAttribute(${JSON.stringify(step.attribute)});
            if (attrValue !== ${JSON.stringify(step.expectedValue)}) {
              throw new Error('Attribute assertion failed. Expected: ${step.expectedValue}, Got: ' + attrValue);
            }
          ` : ''}

          return { success: true };
        }
      `;

    case 'keyboard':
      return `
        export default async function({ page }) {
          await page.keyboard.press(${JSON.stringify(step.key)});
          return { success: true };
        }
      `;

    case 'screenshot':
      return `
        export default async function({ page }) {
          // Screenshot is handled separately
          return { success: true };
        }
      `;

    default:
      return `
        export default async function({ page }) {
          throw new Error('Unknown step type: ${step.type}');
        }
      `;
  }
}

/**
 * Take screenshot for a step
 */
async function takeStepScreenshot(baseUrl, step, runId, stepIndex) {
  const screenshotUrl = `${BROWSERLESS_URL}/screenshot?token=${BROWSERLESS_TOKEN}`;

  // Navigate to the current state and take screenshot
  const response = await fetch(screenshotUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: step.url || baseUrl,
      options: {
        type: 'png',
        fullPage: step.fullPage || false
      },
      viewport: {
        width: 1920,
        height: 1080
      }
    })
  });

  if (!response.ok) {
    throw new Error('Failed to take screenshot');
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = `${runId}_step_${stepIndex}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  fs.writeFileSync(filepath, buffer);

  return {
    path: filepath,
    filename
  };
}

/**
 * Run multiple tests in parallel
 */
export async function runTestsParallel(tests, options = {}) {
  const concurrency = options.concurrency || 3;
  const results = [];
  const db = getDb();

  const chunks = [];
  for (let i = 0; i < tests.length; i += concurrency) {
    chunks.push(tests.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (test) => {
        const runId = uuidv4();
        db.prepare(`
          INSERT INTO test_runs (id, test_id, status, started_at)
          VALUES (?, ?, 'running', datetime('now'))
        `).run(runId, test.id);

        try {
          const result = await runTest(test, runId, options);

          db.prepare(`
            UPDATE test_runs
            SET status = ?, completed_at = datetime('now'), duration_ms = ?,
                results = ?, screenshots = ?, error_message = ?
            WHERE id = ?
          `).run(
            result.status,
            result.duration,
            JSON.stringify(result.stepResults),
            JSON.stringify(result.screenshots),
            result.error || null,
            runId
          );

          return { test_id: test.id, run_id: runId, ...result };
        } catch (error) {
          db.prepare(`
            UPDATE test_runs
            SET status = 'error', completed_at = datetime('now'), error_message = ?
            WHERE id = ?
          `).run(error.message, runId);

          return { test_id: test.id, run_id: runId, status: 'error', error: error.message };
        }
      })
    );

    results.push(...chunkResults);
  }

  return results;
}

export default { runTest, runTestsParallel };
