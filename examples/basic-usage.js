import { takeScreenshot, takeMultipleScreenshots } from '../src/index.js';

// Example 1: Basic screenshot
async function basicScreenshot() {
  const buffer = await takeScreenshot({
    url: 'https://example.com',
    outputPath: './screenshots/example.png',
  });
  console.log('Basic screenshot taken, buffer size:', buffer.length);
}

// Example 2: Full page screenshot with custom viewport
async function fullPageScreenshot() {
  const buffer = await takeScreenshot({
    url: 'https://github.com',
    outputPath: './screenshots/github-fullpage.png',
    fullPage: true,
    viewport: {
      width: 1280,
      height: 720,
    },
  });
  console.log('Full page screenshot taken, buffer size:', buffer.length);
}

// Example 3: Screenshot with wait for element
async function screenshotWithWait() {
  const buffer = await takeScreenshot({
    url: 'https://example.com',
    outputPath: './screenshots/example-waited.png',
    waitForSelector: 'body',
    waitForTimeout: 2000,
  });
  console.log('Screenshot with wait taken, buffer size:', buffer.length);
}

// Example 4: Multiple screenshots
async function multipleScreenshots() {
  const screenshots = await takeMultipleScreenshots([
    { url: 'https://example.com', outputPath: './screenshots/multi-1.png' },
    { url: 'https://google.com', outputPath: './screenshots/multi-2.png' },
    { url: 'https://github.com', outputPath: './screenshots/multi-3.png' },
  ]);
  console.log(`Took ${screenshots.length} screenshots`);
}

// Run examples
async function main() {
  try {
    console.log('Running basic screenshot example...');
    await basicScreenshot();

    console.log('\nRunning full page screenshot example...');
    await fullPageScreenshot();

    console.log('\nRunning screenshot with wait example...');
    await screenshotWithWait();

    console.log('\nRunning multiple screenshots example...');
    await multipleScreenshots();

    console.log('\nAll examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error.message);
  }
}

main();
