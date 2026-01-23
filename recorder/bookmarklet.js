/**
 * QA Automation Recorder Bookmarklet
 *
 * This script can be used as a bookmarklet to record browser interactions.
 * Drag this to your bookmarks bar:
 *
 * javascript:(function(){var s=document.createElement('script');s.src='http://localhost:3001/recorder/inject.js';document.body.appendChild(s);})();
 */

(function() {
  // Check if already initialized
  if (window.__qaRecorder) {
    window.__qaRecorder.toggle();
    return;
  }

  const recorder = {
    isRecording: false,
    steps: [],
    overlay: null,
    panel: null,

    init() {
      this.createOverlay();
      this.createPanel();
      this.bindEvents();
      console.log('QA Recorder initialized');
    },

    createOverlay() {
      this.overlay = document.createElement('div');
      this.overlay.id = 'qa-recorder-overlay';
      this.overlay.innerHTML = `
        <style>
          #qa-recorder-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 999998;
          }
          .qa-highlight {
            outline: 3px solid #0ea5e9 !important;
            outline-offset: 2px !important;
          }
        </style>
      `;
      document.body.appendChild(this.overlay);
    },

    createPanel() {
      this.panel = document.createElement('div');
      this.panel.id = 'qa-recorder-panel';
      this.panel.innerHTML = `
        <style>
          #qa-recorder-panel {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 320px;
            max-height: 400px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            overflow: hidden;
          }
          #qa-recorder-panel * {
            box-sizing: border-box;
          }
          .qa-panel-header {
            background: #0ea5e9;
            color: white;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .qa-panel-header h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
          }
          .qa-panel-body {
            padding: 16px;
            max-height: 250px;
            overflow-y: auto;
          }
          .qa-step {
            display: flex;
            align-items: center;
            padding: 8px;
            background: #f3f4f6;
            border-radius: 6px;
            margin-bottom: 8px;
            font-size: 12px;
          }
          .qa-step-num {
            width: 24px;
            height: 24px;
            background: #0ea5e9;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 600;
            margin-right: 8px;
            flex-shrink: 0;
          }
          .qa-step-info {
            flex: 1;
            overflow: hidden;
          }
          .qa-step-type {
            font-weight: 600;
            text-transform: capitalize;
          }
          .qa-step-selector {
            font-family: monospace;
            font-size: 10px;
            color: #6b7280;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .qa-panel-footer {
            padding: 12px 16px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            gap: 8px;
          }
          .qa-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            flex: 1;
            transition: background 0.2s;
          }
          .qa-btn-primary {
            background: #0ea5e9;
            color: white;
          }
          .qa-btn-primary:hover {
            background: #0284c7;
          }
          .qa-btn-secondary {
            background: #e5e7eb;
            color: #374151;
          }
          .qa-btn-secondary:hover {
            background: #d1d5db;
          }
          .qa-btn-danger {
            background: #ef4444;
            color: white;
          }
          .qa-btn-danger:hover {
            background: #dc2626;
          }
          .qa-recording {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .qa-recording-dot {
            width: 8px;
            height: 8px;
            background: #ef4444;
            border-radius: 50%;
            animation: pulse 1s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .qa-empty {
            text-align: center;
            color: #9ca3af;
            padding: 20px;
          }
        </style>
        <div class="qa-panel-header">
          <h3>QA Recorder</h3>
          <div class="qa-recording" id="qa-recording-indicator" style="display: none;">
            <div class="qa-recording-dot"></div>
            <span>Recording</span>
          </div>
        </div>
        <div class="qa-panel-body" id="qa-steps-list">
          <div class="qa-empty">Click "Start" to begin recording</div>
        </div>
        <div class="qa-panel-footer">
          <button class="qa-btn qa-btn-primary" id="qa-start-btn">Start</button>
          <button class="qa-btn qa-btn-secondary" id="qa-export-btn">Export</button>
          <button class="qa-btn qa-btn-danger" id="qa-close-btn">Close</button>
        </div>
      `;
      document.body.appendChild(this.panel);

      // Bind panel button events
      document.getElementById('qa-start-btn').addEventListener('click', () => this.toggleRecording());
      document.getElementById('qa-export-btn').addEventListener('click', () => this.exportSteps());
      document.getElementById('qa-close-btn').addEventListener('click', () => this.close());
    },

    bindEvents() {
      // Click recording
      document.addEventListener('click', (e) => {
        if (!this.isRecording) return;
        if (e.target.closest('#qa-recorder-panel')) return;

        const selector = this.getSelector(e.target);
        this.addStep({
          type: 'click',
          selector,
          description: `Click on ${selector}`
        });
      }, true);

      // Input recording
      document.addEventListener('input', (e) => {
        if (!this.isRecording) return;
        if (e.target.closest('#qa-recorder-panel')) return;

        // Debounce input events
        clearTimeout(e.target.__qaDebounce);
        e.target.__qaDebounce = setTimeout(() => {
          const selector = this.getSelector(e.target);
          this.addStep({
            type: 'type',
            selector,
            value: e.target.value,
            description: `Type "${e.target.value}" into ${selector}`
          });
        }, 500);
      }, true);

      // Highlight on hover
      document.addEventListener('mouseover', (e) => {
        if (!this.isRecording) return;
        if (e.target.closest('#qa-recorder-panel')) return;

        document.querySelectorAll('.qa-highlight').forEach(el => {
          el.classList.remove('qa-highlight');
        });
        e.target.classList.add('qa-highlight');
      }, true);
    },

    getSelector(element) {
      // Try data-testid first
      if (element.dataset.testid) {
        return `[data-testid="${element.dataset.testid}"]`;
      }

      // Try ID
      if (element.id) {
        return `#${element.id}`;
      }

      // Try unique class combination
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ').filter(c => c && !c.includes('qa-'));
        if (classes.length > 0) {
          const selector = element.tagName.toLowerCase() + '.' + classes.join('.');
          if (document.querySelectorAll(selector).length === 1) {
            return selector;
          }
        }
      }

      // Try name attribute
      if (element.name) {
        return `[name="${element.name}"]`;
      }

      // Fall back to nth-child path
      const path = [];
      let current = element;
      while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
          selector = `#${current.id}`;
          path.unshift(selector);
          break;
        }
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            c => c.tagName === current.tagName
          );
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `:nth-child(${index})`;
          }
        }
        path.unshift(selector);
        current = parent;
      }
      return path.join(' > ');
    },

    addStep(step) {
      // Don't add duplicate consecutive steps
      const lastStep = this.steps[this.steps.length - 1];
      if (lastStep && lastStep.type === step.type && lastStep.selector === step.selector) {
        if (step.type === 'type') {
          // Update value for type steps
          lastStep.value = step.value;
          lastStep.description = step.description;
          this.renderSteps();
          return;
        }
        return; // Skip duplicate clicks
      }

      this.steps.push(step);
      this.renderSteps();
    },

    renderSteps() {
      const container = document.getElementById('qa-steps-list');
      if (this.steps.length === 0) {
        container.innerHTML = '<div class="qa-empty">Click "Start" to begin recording</div>';
        return;
      }

      container.innerHTML = this.steps.map((step, i) => `
        <div class="qa-step">
          <div class="qa-step-num">${i + 1}</div>
          <div class="qa-step-info">
            <div class="qa-step-type">${step.type}</div>
            <div class="qa-step-selector">${step.selector || step.description}</div>
          </div>
        </div>
      `).join('');

      container.scrollTop = container.scrollHeight;
    },

    toggleRecording() {
      this.isRecording = !this.isRecording;
      const btn = document.getElementById('qa-start-btn');
      const indicator = document.getElementById('qa-recording-indicator');

      if (this.isRecording) {
        btn.textContent = 'Stop';
        btn.classList.remove('qa-btn-primary');
        btn.classList.add('qa-btn-danger');
        indicator.style.display = 'flex';

        // Add initial navigation step
        if (this.steps.length === 0) {
          this.addStep({
            type: 'navigate',
            url: window.location.href,
            description: `Navigate to ${window.location.href}`
          });
        }
      } else {
        btn.textContent = 'Start';
        btn.classList.remove('qa-btn-danger');
        btn.classList.add('qa-btn-primary');
        indicator.style.display = 'none';
        document.querySelectorAll('.qa-highlight').forEach(el => {
          el.classList.remove('qa-highlight');
        });
      }
    },

    exportSteps() {
      if (this.steps.length === 0) {
        alert('No steps to export');
        return;
      }

      const testData = {
        name: 'Recorded Test - ' + new Date().toLocaleString(),
        description: 'Recorded from ' + window.location.href,
        base_url: window.location.origin,
        steps: this.steps
      };

      // Copy to clipboard
      navigator.clipboard.writeText(JSON.stringify(testData, null, 2))
        .then(() => alert('Test copied to clipboard! Paste it in the QA Dashboard.'))
        .catch(() => {
          // Fallback: download as file
          const blob = new Blob([JSON.stringify(testData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'recorded-test.json';
          a.click();
        });
    },

    toggle() {
      this.panel.style.display = this.panel.style.display === 'none' ? 'block' : 'none';
    },

    close() {
      this.isRecording = false;
      document.querySelectorAll('.qa-highlight').forEach(el => {
        el.classList.remove('qa-highlight');
      });
      this.panel.remove();
      this.overlay.remove();
      delete window.__qaRecorder;
    }
  };

  window.__qaRecorder = recorder;
  recorder.init();
})();
