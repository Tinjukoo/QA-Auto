import express from 'express';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '../../../screenshots');
const BROWSERLESS_URL = process.env.BROWSERLESS_URL || 'https://production-sfo.browserless.io';
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const router = express.Router();

// Recording script to inject into proxied pages
const getRecordingScript = (baseUrl) => `
<script>
(function() {
  // QA Recorder - Interaction Recording Script
  let isRecording = false;
  let lastClickTime = 0;
  const DEBOUNCE_TIME = 100;

  // Generate CSS selector for an element
  function getSelector(element) {
    if (element.id) {
      return '#' + CSS.escape(element.id);
    }

    if (element.name) {
      return element.tagName.toLowerCase() + '[name="' + element.name + '"]';
    }

    // Try data-testid or data-test
    if (element.dataset.testid) {
      return '[data-testid="' + element.dataset.testid + '"]';
    }
    if (element.dataset.test) {
      return '[data-test="' + element.dataset.test + '"]';
    }

    // Build path from element
    let path = [];
    let current = element;

    while (current && current !== document.body && path.length < 5) {
      let selector = current.tagName.toLowerCase();

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\\s+/).filter(c => !c.startsWith('hover') && !c.startsWith('focus') && c.length < 30);
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).map(c => CSS.escape(c)).join('.');
        }
      }

      // Add nth-child if needed
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += ':nth-child(' + index + ')';
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  // Get element text for description
  function getElementText(element) {
    const text = element.innerText || element.textContent || element.value || '';
    return text.trim().substring(0, 50);
  }

  // Send action to parent
  function sendAction(action) {
    if (!isRecording) return;

    window.parent.postMessage({
      type: 'RECORDED_ACTION',
      action: action
    }, '*');
  }

  // Handle click events
  document.addEventListener('click', function(e) {
    if (!isRecording) return;

    const now = Date.now();
    if (now - lastClickTime < DEBOUNCE_TIME) return;
    lastClickTime = now;

    const element = e.target;
    const selector = getSelector(element);
    const text = getElementText(element);

    sendAction({
      type: 'click',
      selector: selector,
      description: 'Click on ' + (text || element.tagName.toLowerCase())
    });
  }, true);

  // Handle input events
  let inputTimeout = null;
  document.addEventListener('input', function(e) {
    if (!isRecording) return;

    const element = e.target;
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return;

    clearTimeout(inputTimeout);
    inputTimeout = setTimeout(function() {
      const selector = getSelector(element);
      const value = element.value;

      if (element.tagName === 'SELECT') {
        sendAction({
          type: 'select',
          selector: selector,
          value: value,
          description: 'Select "' + value + '"'
        });
      } else {
        sendAction({
          type: 'type',
          selector: selector,
          value: value,
          description: 'Type "' + (value.length > 30 ? value.substring(0, 30) + '...' : value) + '"'
        });
      }
    }, 500);
  }, true);

  // Handle scroll events
  let scrollTimeout = null;
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', function() {
    if (!isRecording) return;

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(function() {
      const scrollY = window.scrollY;
      if (Math.abs(scrollY - lastScrollY) > 100) {
        sendAction({
          type: 'scroll',
          y: scrollY,
          description: 'Scroll to ' + scrollY + 'px'
        });
        lastScrollY = scrollY;
      }
    }, 300);
  }, true);

  // Handle keyboard events for special keys
  document.addEventListener('keydown', function(e) {
    if (!isRecording) return;

    // Only capture special keys
    if (['Enter', 'Escape', 'Tab', 'Backspace', 'Delete'].includes(e.key)) {
      const selector = getSelector(e.target);
      sendAction({
        type: 'keyboard',
        key: e.key,
        selector: selector,
        description: 'Press ' + e.key
      });
    }
  }, true);

  // Listen for messages from parent
  window.addEventListener('message', function(e) {
    if (e.data.type === 'START_RECORDING') {
      isRecording = true;
      console.log('QA Recorder: Recording started');
    } else if (e.data.type === 'STOP_RECORDING') {
      isRecording = false;
      console.log('QA Recorder: Recording stopped');
    }
  });

  console.log('QA Recorder: Script loaded');
})();
</script>
`;

// Proxy endpoint
router.get('/', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const proxyReq = protocol.request(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'identity'
      }
    }, (proxyRes) => {
      // Handle redirects
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        const redirectUrl = new URL(proxyRes.headers.location, targetUrl).href;
        return res.redirect(`/api/proxy?url=${encodeURIComponent(redirectUrl)}`);
      }

      let body = '';
      proxyRes.setEncoding('utf8');

      proxyRes.on('data', (chunk) => {
        body += chunk;
      });

      proxyRes.on('end', () => {
        const contentType = proxyRes.headers['content-type'] || '';

        // Only inject script into HTML pages
        if (contentType.includes('text/html')) {
          // Inject base tag for relative URLs
          const baseTag = `<base href="${targetUrl}">`;

          // Inject recording script before </body>
          let modifiedBody = body;

          // Add base tag after <head>
          if (modifiedBody.includes('<head>')) {
            modifiedBody = modifiedBody.replace('<head>', '<head>' + baseTag);
          } else if (modifiedBody.includes('<head ')) {
            modifiedBody = modifiedBody.replace(/<head[^>]*>/, (match) => match + baseTag);
          } else {
            modifiedBody = baseTag + modifiedBody;
          }

          // Add recording script before </body>
          const recordingScript = getRecordingScript(targetUrl);
          if (modifiedBody.includes('</body>')) {
            modifiedBody = modifiedBody.replace('</body>', recordingScript + '</body>');
          } else {
            modifiedBody = modifiedBody + recordingScript;
          }

          // Remove X-Frame-Options and CSP headers that might block iframe
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(modifiedBody);
        } else {
          // For non-HTML content, just pass through
          res.setHeader('Content-Type', contentType);
          res.send(body);
        }
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center; background: #1a1a1a; color: #fff;">
          <h1 style="color: #ef4444;">Failed to load page</h1>
          <p style="color: #888;">${err.message}</p>
          <p style="color: #666; font-size: 14px;">URL: ${targetUrl}</p>
        </body>
        </html>
      `);
    });

    proxyReq.end();
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Screenshot endpoint using Browserless
router.post('/screenshot', async (req, res) => {
  const { url, fullPage = false } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!BROWSERLESS_TOKEN) {
    return res.status(500).json({ error: 'Browserless token not configured' });
  }

  try {
    const screenshotUrl = `${BROWSERLESS_URL}/screenshot?token=${BROWSERLESS_TOKEN}`;

    const response = await fetch(screenshotUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        options: {
          type: 'png',
          fullPage: fullPage
        },
        viewport: {
          width: 1920,
          height: 1080
        },
        gotoOptions: {
          waitUntil: 'networkidle2',
          timeout: 30000
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Screenshot failed: ${errorText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `screenshot_${Date.now()}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);

    fs.writeFileSync(filepath, buffer);

    res.json({
      success: true,
      filename: filename,
      path: `/screenshots/${filename}`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Screenshot error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
