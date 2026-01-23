# QA-Auto

A comprehensive QA automation tool similar to Reflect. Create, record, and run automated browser tests without writing code.

## Features

### Test Recorder
- Record user interactions (clicks, typing, navigation, scrolling)
- Capture screenshots at each step
- Generate replayable test scripts from recordings
- Support for selecting elements using multiple strategies (CSS, XPath, text content)
- Bookmarklet for easy recording on any website

### Test Runner
- Execute recorded tests headlessly using Browserless.io
- Run tests in parallel
- Retry failed steps automatically
- Generate detailed test reports with pass/fail status

### Visual Testing
- Compare screenshots between test runs
- Highlight visual differences using pixelmatch
- Set sensitivity thresholds for visual comparisons
- Baseline management for visual regression testing

### Web Dashboard (React + Vite + Tailwind)
- Create and manage test suites
- View test run history and results
- See screenshots and error logs
- Schedule tests to run automatically
- Real-time test execution status

### API & Webhooks
- REST API to trigger tests programmatically
- Webhook notifications on test completion (integrate with n8n)
- Export test results as JSON

## Project Structure

```
qa-auto/
├── frontend/           # React dashboard (Vite + Tailwind)
├── backend/            # Express API server
│   ├── src/
│   │   ├── routes/     # API endpoints
│   │   ├── services/   # Business logic
│   │   └── db/         # SQLite database
│   └── runner/         # Test execution engine
├── recorder/           # Browser recording tools
├── src/                # Legacy screenshot utilities
├── screenshots/        # Generated screenshots
└── reports/            # Test reports
```

## Setup

### Prerequisites
- Node.js 18+
- Browserless.io API token

### Installation

1. Install all dependencies:
```bash
npm run install:all
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` and add your configuration:
```env
BROWSERLESS_URL=https://production-sfo.browserless.io
BROWSERLESS_TOKEN=your_token_here
QA_WEBHOOK_URL=https://your-n8n-instance/webhook/qa-screenshot
BACKEND_PORT=3001
FRONTEND_PORT=3000
```

### Running the Application

Start both frontend and backend:
```bash
npm run dev
```

Or start them separately:
```bash
# Backend only (API server)
npm run start:backend

# Frontend only (Dashboard)
npm run start:frontend
```

Access the dashboard at: http://localhost:3000

## API Reference

### Tests

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tests` | GET | List all tests |
| `/api/tests/:id` | GET | Get test details |
| `/api/tests` | POST | Create new test |
| `/api/tests/:id` | PUT | Update test |
| `/api/tests/:id` | DELETE | Delete test |
| `/api/tests/:id/duplicate` | POST | Duplicate test |
| `/api/tests/:id/runs` | GET | Get test run history |

### Test Suites

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/suites` | GET | List all suites |
| `/api/suites/:id` | GET | Get suite with tests |
| `/api/suites` | POST | Create suite |
| `/api/suites/:id` | PUT | Update suite |
| `/api/suites/:id` | DELETE | Delete suite |
| `/api/suites/:id/run` | POST | Run all tests in suite |

### Test Runs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/runs` | GET | List runs with pagination |
| `/api/runs/:id` | GET | Get run details |
| `/api/runs` | POST | Create and execute run |
| `/api/runs/:id/rerun` | POST | Rerun a test |
| `/api/runs/:id/cancel` | POST | Cancel running test |
| `/api/runs/stats/summary` | GET | Get run statistics |

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks` | GET | List webhooks |
| `/api/webhooks/events` | GET | List available events |
| `/api/webhooks/:id` | GET | Get webhook details |
| `/api/webhooks` | POST | Create webhook |
| `/api/webhooks/:id` | PUT | Update webhook |
| `/api/webhooks/:id` | DELETE | Delete webhook |
| `/api/webhooks/:id/test` | POST | Test webhook |

### Schedules

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/schedules` | GET | List schedules |
| `/api/schedules/:id` | GET | Get schedule details |
| `/api/schedules` | POST | Create schedule |
| `/api/schedules/:id` | PUT | Update schedule |
| `/api/schedules/:id` | DELETE | Delete schedule |
| `/api/schedules/:id/trigger` | POST | Manually trigger |

## Test Step Types

| Type | Description | Properties |
|------|-------------|------------|
| `navigate` | Navigate to URL | `url` |
| `click` | Click element | `selector` |
| `type` | Type text into input | `selector`, `value` |
| `select` | Select dropdown option | `selector`, `value` |
| `hover` | Hover over element | `selector` |
| `scroll` | Scroll page/element | `selector`, `y` |
| `wait` | Wait for element/time | `selector`, `duration` |
| `assert` | Assert element state | `selector`, `assertType`, `expectedValue` |
| `keyboard` | Press keyboard key | `key` |
| `screenshot` | Take screenshot | `fullPage` |

## Webhook Events

- `test.completed` - Fired when a test run completes (any status)
- `test.failed` - Fired when a test run fails
- `test.passed` - Fired when a test run passes
- `suite.completed` - Fired when all tests in a suite complete
- `visual.diff_detected` - Fired when visual differences are detected
- `schedule.triggered` - Fired when a scheduled run starts

## Using the Recorder

### Browser Bookmarklet

1. Go to the Recorder page in the dashboard
2. Drag the bookmarklet to your browser's bookmarks bar
3. Navigate to the page you want to test
4. Click the bookmarklet to start recording
5. Interact with the page normally
6. Export the recorded steps and import them into the dashboard

### Manual Recording

You can also manually add steps in the Test Editor with full control over selectors and actions.

## n8n Integration

To integrate with n8n:

1. Create a webhook node in n8n
2. Copy the webhook URL
3. Add it as a webhook in the QA Auto dashboard
4. Select which events to receive
5. Use the webhook data in your n8n workflows

Example n8n workflow:
- Trigger: Webhook (from QA Auto)
- Action: Send Slack notification on test failure
- Action: Create Jira ticket for failed tests

## Legacy Screenshot API

The original screenshot functionality is still available:

```javascript
import { takeScreenshot, takeMultipleScreenshots } from 'qa-auto';

const buffer = await takeScreenshot({
  url: 'https://example.com',
  outputPath: './screenshots/example.png',
  fullPage: true,
  viewport: { width: 1280, height: 720 },
});
```

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + React Router
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Visual Testing**: pixelmatch + pngjs
- **Browser Automation**: Browserless.io API

## License

MIT
