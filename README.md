# QA-Auto

QA Automation toolkit with screenshot API integration using Browserless.io.

## Features

- Take screenshots of any webpage
- Full page capture support
- Custom viewport settings
- Wait for elements or timeout before capture
- Batch screenshot processing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` and add your Browserless.io token:
```
BROWSERLESS_URL=https://production-sfo.browserless.io/screenshot
BROWSERLESS_TOKEN=your_token_here
```

## Usage

### CLI

```bash
# Basic usage
npm run screenshot -- https://example.com ./screenshots/example.png

# Or directly with node
node src/screenshot.js https://example.com ./screenshots/output.png
```

### Programmatic

```javascript
import { takeScreenshot, takeMultipleScreenshots } from 'qa-auto';

// Basic screenshot
const buffer = await takeScreenshot({
  url: 'https://example.com',
  outputPath: './screenshots/example.png',
});

// Full page with custom viewport
const fullPage = await takeScreenshot({
  url: 'https://example.com',
  outputPath: './screenshots/fullpage.png',
  fullPage: true,
  viewport: { width: 1280, height: 720 },
});

// Wait for element before screenshot
const waited = await takeScreenshot({
  url: 'https://example.com',
  outputPath: './screenshots/waited.png',
  waitForSelector: '.main-content',
  waitForTimeout: 3000,
});

// Multiple screenshots
const screenshots = await takeMultipleScreenshots([
  { url: 'https://example.com', outputPath: './screenshots/1.png' },
  { url: 'https://google.com', outputPath: './screenshots/2.png' },
]);
```

## API Reference

### `takeScreenshot(options)`

Takes a screenshot of a webpage.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | required | The URL to screenshot |
| `outputPath` | string | - | Path to save the screenshot |
| `viewport.width` | number | 1920 | Viewport width |
| `viewport.height` | number | 1080 | Viewport height |
| `fullPage` | boolean | false | Capture full page |
| `type` | string | 'png' | Image type (png/jpeg) |
| `quality` | number | - | JPEG quality (1-100) |
| `waitForTimeout` | number | - | Wait time in ms |
| `waitForSelector` | string | - | CSS selector to wait for |

Returns: `Promise<Buffer>`

### `takeMultipleScreenshots(configs)`

Takes multiple screenshots in sequence.

| Parameter | Type | Description |
|-----------|------|-------------|
| `configs` | Array | Array of screenshot option objects |

Returns: `Promise<Array<Buffer>>`

## License

MIT
