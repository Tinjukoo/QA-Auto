import 'dotenv/config';
import http from 'http';
import { URL } from 'url';
import { takeScreenshot } from './screenshot.js';
import { sendToWebhook } from './webhook.js';

const PORT = process.env.PORT || 3000;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Screenshot Tool</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; margin-bottom: 10px; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .card {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    label { display: block; margin-bottom: 8px; font-weight: 500; color: #333; }
    input[type="text"], input[type="url"] {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 16px;
      margin-bottom: 20px;
    }
    input:focus { outline: none; border-color: #007bff; }
    .checkbox-group { margin-bottom: 20px; }
    .checkbox-group label { display: inline; font-weight: normal; margin-left: 8px; }
    button {
      background: #007bff;
      color: white;
      border: none;
      padding: 14px 28px;
      font-size: 16px;
      border-radius: 6px;
      cursor: pointer;
      width: 100%;
    }
    button:hover { background: #0056b3; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .result {
      margin-top: 30px;
      padding: 20px;
      border-radius: 6px;
      display: none;
    }
    .result.success { background: #d4edda; border: 1px solid #c3e6cb; }
    .result.error { background: #f8d7da; border: 1px solid #f5c6cb; }
    .preview { margin-top: 20px; text-align: center; }
    .preview img { max-width: 100%; border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
    .loading { text-align: center; padding: 20px; }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #007bff;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
      margin: 0 auto 10px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <h1>QA Screenshot Tool</h1>
  <p class="subtitle">Capture screenshots and send them to your webhook</p>

  <div class="card">
    <form id="screenshotForm">
      <label for="url">Website URL</label>
      <input type="url" id="url" name="url" placeholder="https://example.com" required>

      <label for="testName">Test Name (optional)</label>
      <input type="text" id="testName" name="testName" placeholder="e.g., homepage-test">

      <div class="checkbox-group">
        <input type="checkbox" id="fullPage" name="fullPage">
        <label for="fullPage">Capture full page</label>
      </div>

      <div class="checkbox-group">
        <input type="checkbox" id="sendWebhook" name="sendWebhook" checked>
        <label for="sendWebhook">Send to webhook</label>
      </div>

      <button type="submit">Take Screenshot</button>
    </form>

    <div id="loading" class="loading" style="display:none;">
      <div class="spinner"></div>
      <p>Capturing screenshot...</p>
    </div>

    <div id="result" class="result"></div>
    <div id="preview" class="preview"></div>
  </div>

  <script>
    const form = document.getElementById('screenshotForm');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const preview = document.getElementById('preview');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const url = document.getElementById('url').value;
      const testName = document.getElementById('testName').value;
      const fullPage = document.getElementById('fullPage').checked;
      const sendWebhook = document.getElementById('sendWebhook').checked;

      form.style.display = 'none';
      loading.style.display = 'block';
      result.style.display = 'none';
      preview.innerHTML = '';

      try {
        const response = await fetch('/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, testName, fullPage, sendWebhook })
        });

        const data = await response.json();

        if (data.success) {
          result.className = 'result success';
          result.innerHTML = '<strong>Success!</strong> Screenshot captured.' +
            (data.webhookSent ? ' Sent to webhook.' : '');
          preview.innerHTML = '<img src="data:image/png;base64,' + data.screenshot + '" alt="Screenshot">';
        } else {
          result.className = 'result error';
          result.innerHTML = '<strong>Error:</strong> ' + data.error;
        }
      } catch (err) {
        result.className = 'result error';
        result.innerHTML = '<strong>Error:</strong> ' + err.message;
      }

      loading.style.display = 'none';
      result.style.display = 'block';
      form.style.display = 'block';
    });
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/screenshot') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { url: targetUrl, testName, fullPage, sendWebhook } = JSON.parse(body);

        const screenshot = await takeScreenshot({
          url: targetUrl,
          fullPage: fullPage || false,
        });

        let webhookSent = false;
        if (sendWebhook) {
          await sendToWebhook({
            url: targetUrl,
            screenshot,
            metadata: { testName: testName || 'web-ui-capture', fullPage },
          });
          webhookSent = true;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          screenshot: screenshot.toString('base64'),
          webhookSent,
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`QA Screenshot Tool running at http://localhost:${PORT}`);
});
