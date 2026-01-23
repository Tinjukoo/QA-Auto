import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIFF_DIR = path.join(__dirname, '../../screenshots/diffs');

// Ensure diff directory exists
if (!fs.existsSync(DIFF_DIR)) {
  fs.mkdirSync(DIFF_DIR, { recursive: true });
}

/**
 * Compare two screenshots and detect visual differences
 * @param {string} baselinePath - Path to baseline screenshot
 * @param {string} currentPath - Path to current screenshot
 * @param {number} threshold - Difference threshold (0-1, default 0.1 = 10%)
 * @returns {Object} Comparison result
 */
export async function compareScreenshots(baselinePath, currentPath, threshold = 0.1) {
  // Read both images
  const baseline = await readPNG(baselinePath);
  const current = await readPNG(currentPath);

  // Handle size differences
  if (baseline.width !== current.width || baseline.height !== current.height) {
    // Resize to match (use the larger dimensions)
    const width = Math.max(baseline.width, current.width);
    const height = Math.max(baseline.height, current.height);

    const baselineResized = resizeImage(baseline, width, height);
    const currentResized = resizeImage(current, width, height);

    return performComparison(baselineResized, currentResized, threshold, currentPath);
  }

  return performComparison(baseline, current, threshold, currentPath);
}

/**
 * Read PNG file
 */
function readPNG(filepath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filepath)
      .pipe(new PNG())
      .on('parsed', function() {
        resolve(this);
      })
      .on('error', reject);
  });
}

/**
 * Resize image to specified dimensions
 */
function resizeImage(img, width, height) {
  const resized = new PNG({ width, height });

  // Copy existing pixels
  for (let y = 0; y < img.height && y < height; y++) {
    for (let x = 0; x < img.width && x < width; x++) {
      const idx = (y * img.width + x) * 4;
      const newIdx = (y * width + x) * 4;
      resized.data[newIdx] = img.data[idx];
      resized.data[newIdx + 1] = img.data[idx + 1];
      resized.data[newIdx + 2] = img.data[idx + 2];
      resized.data[newIdx + 3] = img.data[idx + 3];
    }
  }

  // Fill remaining with white
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (y >= img.height || x >= img.width) {
        resized.data[idx] = 255;
        resized.data[idx + 1] = 255;
        resized.data[idx + 2] = 255;
        resized.data[idx + 3] = 255;
      }
    }
  }

  return resized;
}

/**
 * Perform the actual comparison
 */
function performComparison(baseline, current, threshold, currentPath) {
  const { width, height } = baseline;
  const diff = new PNG({ width, height });

  const mismatchedPixels = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    width,
    height,
    {
      threshold: 0.1, // Per-pixel sensitivity
      includeAA: false, // Ignore anti-aliasing differences
      alpha: 0.5
    }
  );

  const totalPixels = width * height;
  const diffPercent = mismatchedPixels / totalPixels;

  // Generate diff image path
  const filename = path.basename(currentPath, '.png') + '_diff.png';
  const diffPath = path.join(DIFF_DIR, filename);

  // Write diff image
  const diffBuffer = PNG.sync.write(diff);
  fs.writeFileSync(diffPath, diffBuffer);

  return {
    match: diffPercent <= threshold,
    diffPercent,
    mismatchedPixels,
    totalPixels,
    diffPath,
    width,
    height
  };
}

/**
 * Update baseline image
 * @param {string} testId - Test ID
 * @param {number} stepIndex - Step index
 * @param {string} newBaselinePath - Path to new baseline image
 */
export function updateBaseline(testId, stepIndex, newBaselinePath) {
  const baselinesDir = path.join(__dirname, '../../screenshots/baselines');

  if (!fs.existsSync(baselinesDir)) {
    fs.mkdirSync(baselinesDir, { recursive: true });
  }

  const baselineFilename = `${testId}_step_${stepIndex}_baseline.png`;
  const baselinePath = path.join(baselinesDir, baselineFilename);

  fs.copyFileSync(newBaselinePath, baselinePath);

  return baselinePath;
}

/**
 * Get visual diff summary for a test run
 */
export function getVisualDiffSummary(stepResults) {
  const visualSteps = stepResults.filter(s => s.diff_percent !== null);

  return {
    totalSteps: stepResults.length,
    stepsWithVisualCheck: visualSteps.length,
    stepsWithDiff: visualSteps.filter(s => s.status === 'visual_diff').length,
    averageDiff: visualSteps.length > 0
      ? visualSteps.reduce((sum, s) => sum + (s.diff_percent || 0), 0) / visualSteps.length
      : 0,
    maxDiff: visualSteps.length > 0
      ? Math.max(...visualSteps.map(s => s.diff_percent || 0))
      : 0
  };
}

/**
 * Generate comparison report
 */
export function generateComparisonReport(testId, runId, stepResults) {
  const summary = getVisualDiffSummary(stepResults);

  return {
    testId,
    runId,
    timestamp: new Date().toISOString(),
    summary,
    steps: stepResults.map(s => ({
      index: s.step_index,
      type: s.step_type,
      status: s.status,
      screenshotPath: s.screenshot_path,
      baselinePath: s.baseline_screenshot_path,
      diffPath: s.diff_screenshot_path,
      diffPercent: s.visual_diff_percent
    }))
  };
}

export default {
  compareScreenshots,
  updateBaseline,
  getVisualDiffSummary,
  generateComparisonReport
};
