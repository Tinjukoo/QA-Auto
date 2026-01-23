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
  <title>QA Studio - Automated Testing</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-primary: #030712;
      --bg-secondary: #0f1117;
      --bg-card: #1a1d27;
      --bg-card-hover: #22252f;
      --border: #2d3139;
      --text-primary: #f9fafb;
      --text-secondary: #9ca3af;
      --text-muted: #6b7280;
      --violet-500: #8b5cf6;
      --violet-600: #7c3aed;
      --violet-700: #6d28d9;
      --green-500: #22c55e;
      --green-900: #14532d;
      --amber-500: #f59e0b;
      --amber-900: #78350f;
      --red-500: #ef4444;
      --red-900: #7f1d1d;
      --purple-500: #a855f7;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
    }

    /* Sidebar */
    .sidebar {
      width: 260px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      position: fixed;
      height: 100vh;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 12px;
      margin-bottom: 32px;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--violet-500), var(--purple-500));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-icon svg { width: 20px; height: 20px; }

    .logo-text {
      font-size: 20px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--violet-500), var(--purple-500));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .nav-section {
      margin-bottom: 24px;
    }

    .nav-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      padding: 0 12px;
      margin-bottom: 8px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 14px;
      font-weight: 500;
    }

    .nav-item:hover {
      background: var(--bg-card);
      color: var(--text-primary);
    }

    .nav-item.active {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.1));
      color: var(--violet-500);
    }

    .nav-item svg { width: 20px; height: 20px; opacity: 0.7; }
    .nav-item.active svg { opacity: 1; }

    .nav-badge {
      margin-left: auto;
      background: var(--bg-card);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .sidebar-footer {
      margin-top: auto;
      padding: 16px 12px;
      border-top: 1px solid var(--border);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--violet-600), var(--purple-500));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }

    .user-details { flex: 1; }
    .user-name { font-size: 14px; font-weight: 500; }
    .user-plan { font-size: 12px; color: var(--text-muted); }

    /* Main Content */
    .main {
      flex: 1;
      margin-left: 260px;
      display: flex;
    }

    .content {
      flex: 1;
      padding: 32px;
      overflow-y: auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .header h1 {
      font-size: 28px;
      font-weight: 700;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--violet-500), var(--violet-600));
      color: white;
      box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, var(--violet-600), var(--violet-700));
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
    }

    .btn-secondary {
      background: var(--bg-card);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: var(--bg-card-hover);
    }

    .btn svg { width: 18px; height: 18px; }

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }

    .stat-label {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
    }

    .stat-change {
      font-size: 12px;
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .stat-change.positive { color: var(--green-500); }
    .stat-change.negative { color: var(--red-500); }

    /* Test Cards Grid */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
    }

    .tests-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .test-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .test-card:hover {
      background: var(--bg-card-hover);
      border-color: var(--violet-500);
      transform: translateY(-2px);
    }

    .test-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .test-name {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .test-url {
      font-size: 13px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .test-url svg { width: 14px; height: 14px; }

    .test-status {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }

    .test-status.passed {
      background: rgba(34, 197, 94, 0.15);
      color: var(--green-500);
    }

    .test-status.failed {
      background: rgba(239, 68, 68, 0.15);
      color: var(--red-500);
    }

    .test-status.pending {
      background: rgba(245, 158, 11, 0.15);
      color: var(--amber-500);
    }

    .test-meta {
      display: flex;
      gap: 16px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }

    .test-meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .test-meta-item svg { width: 16px; height: 16px; opacity: 0.6; }

    /* Editor Panel */
    .editor-panel {
      width: 420px;
      background: var(--bg-secondary);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
    }

    .editor-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .editor-title {
      font-size: 16px;
      font-weight: 600;
    }

    .editor-close {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .editor-close:hover {
      background: var(--bg-card);
      color: var(--text-primary);
    }

    .editor-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .editor-section {
      margin-bottom: 24px;
    }

    .editor-section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 12px;
    }

    .input-group {
      margin-bottom: 16px;
    }

    .input-label {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 6px;
      display: block;
    }

    .input {
      width: 100%;
      padding: 10px 14px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-primary);
      font-size: 14px;
      font-family: inherit;
    }

    .input:focus {
      outline: none;
      border-color: var(--violet-500);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
    }

    .input::placeholder { color: var(--text-muted); }

    /* Steps */
    .steps-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      transition: all 0.15s ease;
    }

    .step-item:hover {
      border-color: var(--violet-500);
    }

    .step-number {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
    }

    .step-number.click {
      background: rgba(245, 158, 11, 0.2);
      color: var(--amber-500);
    }

    .step-number.type {
      background: rgba(139, 92, 246, 0.2);
      color: var(--violet-500);
    }

    .step-number.verify {
      background: rgba(34, 197, 94, 0.2);
      color: var(--green-500);
    }

    .step-number.screenshot {
      background: rgba(168, 85, 247, 0.2);
      color: var(--purple-500);
    }

    .step-content { flex: 1; }

    .step-action {
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 2px;
    }

    .step-target {
      font-size: 12px;
      color: var(--text-muted);
      font-family: monospace;
    }

    .step-drag {
      color: var(--text-muted);
      cursor: grab;
    }

    .add-step-btn {
      width: 100%;
      padding: 12px;
      background: transparent;
      border: 2px dashed var(--border);
      border-radius: 10px;
      color: var(--text-muted);
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .add-step-btn:hover {
      border-color: var(--violet-500);
      color: var(--violet-500);
      background: rgba(139, 92, 246, 0.05);
    }

    .editor-footer {
      padding: 20px 24px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 12px;
    }

    .editor-footer .btn { flex: 1; justify-content: center; }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .modal-overlay.active { display: flex; }

    .modal {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 16px;
      width: 480px;
      max-height: 90vh;
      overflow: hidden;
    }

    .modal-header {
      padding: 24px;
      border-bottom: 1px solid var(--border);
    }

    .modal-title {
      font-size: 20px;
      font-weight: 600;
    }

    .modal-body {
      padding: 24px;
    }

    .modal-footer {
      padding: 20px 24px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    /* Result Preview */
    .result-preview {
      margin-top: 20px;
      padding: 20px;
      background: var(--bg-card);
      border-radius: 12px;
      display: none;
    }

    .result-preview.active { display: block; }

    .result-preview.success { border: 1px solid var(--green-500); }
    .result-preview.error { border: 1px solid var(--red-500); }

    .result-message {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .result-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .result-icon.success {
      background: rgba(34, 197, 94, 0.2);
      color: var(--green-500);
    }

    .result-icon.error {
      background: rgba(239, 68, 68, 0.2);
      color: var(--red-500);
    }

    .result-text h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .result-text p {
      font-size: 13px;
      color: var(--text-muted);
    }

    .screenshot-preview {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .screenshot-preview img {
      width: 100%;
      display: block;
    }

    /* Loading Spinner */
    .loading-overlay {
      position: fixed;
      inset: 0;
      background: rgba(3, 7, 18, 0.9);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 200;
    }

    .loading-overlay.active { display: flex; }

    .loading-content {
      text-align: center;
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 3px solid var(--border);
      border-top-color: var(--violet-500);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-text {
      font-size: 16px;
      color: var(--text-secondary);
    }

    /* Checkbox styling */
    .checkbox-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }

    .checkbox-wrapper input {
      display: none;
    }

    .checkbox-custom {
      width: 20px;
      height: 20px;
      border: 2px solid var(--border);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .checkbox-wrapper input:checked + .checkbox-custom {
      background: var(--violet-500);
      border-color: var(--violet-500);
    }

    .checkbox-custom svg {
      width: 14px;
      height: 14px;
      opacity: 0;
      color: white;
    }

    .checkbox-wrapper input:checked + .checkbox-custom svg {
      opacity: 1;
    }

    .checkbox-label {
      font-size: 14px;
      color: var(--text-secondary);
    }
  </style>
</head>
<body>
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="logo">
      <div class="logo-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <span class="logo-text">QA Studio</span>
    </div>

    <nav class="nav-section">
      <div class="nav-label">Main</div>
      <div class="nav-item active">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
        Tests
        <span class="nav-badge">12</span>
      </div>
      <div class="nav-item">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        Results
      </div>
      <div class="nav-item">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Schedules
      </div>
      <div class="nav-item">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        Settings
      </div>
    </nav>

    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">JD</div>
        <div class="user-details">
          <div class="user-name">Jay Davis</div>
          <div class="user-plan">Pro Plan</div>
        </div>
      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="main">
    <div class="content">
      <header class="header">
        <h1>Tests</h1>
        <div class="header-actions">
          <button class="btn btn-secondary">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            Import
          </button>
          <button class="btn btn-primary" onclick="openNewTestModal()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            New Test
          </button>
        </div>
      </header>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Tests</div>
          <div class="stat-value">12</div>
          <div class="stat-change positive">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
            </svg>
            +3 this week
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pass Rate</div>
          <div class="stat-value">94%</div>
          <div class="stat-change positive">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
            </svg>
            +2% from last run
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Avg Duration</div>
          <div class="stat-value">1.2s</div>
          <div class="stat-change negative">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
            </svg>
            +0.3s slower
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Screenshots</div>
          <div class="stat-value">48</div>
          <div class="stat-change positive">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
            </svg>
            +12 today
          </div>
        </div>
      </div>

      <!-- Tests Grid -->
      <div class="section-header">
        <h2 class="section-title">All Tests</h2>
      </div>
      <div class="tests-grid" id="testsGrid">
        <div class="test-card" onclick="openEditor('Homepage Screenshot')">
          <div class="test-card-header">
            <div>
              <div class="test-name">Homepage Screenshot</div>
              <div class="test-url">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
                example.com
              </div>
            </div>
            <span class="test-status passed">Passed</span>
          </div>
          <div class="test-meta">
            <div class="test-meta-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
              3 steps
            </div>
            <div class="test-meta-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              1.2s
            </div>
            <div class="test-meta-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              2 min ago
            </div>
          </div>
        </div>

        <div class="test-card" onclick="openEditor('Login Flow')">
          <div class="test-card-header">
            <div>
              <div class="test-name">Login Flow</div>
              <div class="test-url">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
                app.example.com/login
              </div>
            </div>
            <span class="test-status passed">Passed</span>
          </div>
          <div class="test-meta">
            <div class="test-meta-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
              5 steps
            </div>
            <div class="test-meta-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              2.4s
            </div>
            <div class="test-meta-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              5 min ago
            </div>
          </div>
        </div>

        <div class="test-card" onclick="openEditor('Checkout Process')">
          <div class="test-card-header">
            <div>
              <div class="test-name">Checkout Process</div>
              <div class="test-url">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
                shop.example.com
              </div>
            </div>
            <span class="test-status failed">Failed</span>
          </div>
          <div class="test-meta">
            <div class="test-meta-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
              8 steps
            </div>
            <div class="test-meta-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              3.1s
            </div>
            <div class="test-meta-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              1 hour ago
            </div>
          </div>
        </div>

        <div class="test-card" onclick="openEditor('API Health Check')">
          <div class="test-card-header">
            <div>
              <div class="test-name">API Health Check</div>
              <div class="test-url">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
                api.example.com
              </div>
            </div>
            <span class="test-status pending">Running</span>
          </div>
          <div class="test-meta">
            <div class="test-meta-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
              4 steps
            </div>
            <div class="test-meta-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              0.8s
            </div>
            <div class="test-meta-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              Just now
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Editor Panel -->
    <aside class="editor-panel" id="editorPanel" style="display: none;">
      <div class="editor-header">
        <span class="editor-title" id="editorTitle">Edit Test</span>
        <button class="editor-close" onclick="closeEditor()">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="editor-content">
        <div class="editor-section">
          <div class="editor-section-title">Test Details</div>
          <div class="input-group">
            <label class="input-label">Test Name</label>
            <input type="text" class="input" id="editTestName" value="Homepage Screenshot">
          </div>
          <div class="input-group">
            <label class="input-label">URL</label>
            <input type="url" class="input" id="editTestUrl" placeholder="https://example.com">
          </div>
        </div>

        <div class="editor-section">
          <div class="editor-section-title">Test Steps</div>
          <div class="steps-list" id="stepsList">
            <div class="step-item">
              <div class="step-number click">1</div>
              <div class="step-content">
                <div class="step-action">Navigate to URL</div>
                <div class="step-target">https://example.com</div>
              </div>
              <div class="step-drag">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
                </svg>
              </div>
            </div>
            <div class="step-item">
              <div class="step-number verify">2</div>
              <div class="step-content">
                <div class="step-action">Wait for page load</div>
                <div class="step-target">timeout: 3000ms</div>
              </div>
              <div class="step-drag">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
                </svg>
              </div>
            </div>
            <div class="step-item">
              <div class="step-number screenshot">3</div>
              <div class="step-content">
                <div class="step-action">Take Screenshot</div>
                <div class="step-target">fullPage: true</div>
              </div>
              <div class="step-drag">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
                </svg>
              </div>
            </div>
          </div>
          <button class="add-step-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Step
          </button>
        </div>

        <div class="editor-section">
          <div class="editor-section-title">Options</div>
          <label class="checkbox-wrapper">
            <input type="checkbox" id="editFullPage" checked>
            <div class="checkbox-custom">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <span class="checkbox-label">Capture full page</span>
          </label>
          <div style="height: 12px;"></div>
          <label class="checkbox-wrapper">
            <input type="checkbox" id="editSendWebhook" checked>
            <div class="checkbox-custom">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <span class="checkbox-label">Send to webhook</span>
          </label>
        </div>

        <div id="editorResult" class="result-preview"></div>
      </div>
      <div class="editor-footer">
        <button class="btn btn-secondary" onclick="closeEditor()">Cancel</button>
        <button class="btn btn-primary" onclick="runTest()">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Run Test
        </button>
      </div>
    </aside>
  </main>

  <!-- New Test Modal -->
  <div class="modal-overlay" id="newTestModal">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">Create New Test</h2>
      </div>
      <div class="modal-body">
        <div class="input-group">
          <label class="input-label">Test Name</label>
          <input type="text" class="input" id="newTestName" placeholder="e.g., Homepage Screenshot">
        </div>
        <div class="input-group">
          <label class="input-label">URL to Test</label>
          <input type="url" class="input" id="newTestUrl" placeholder="https://example.com">
        </div>
        <label class="checkbox-wrapper">
          <input type="checkbox" id="newFullPage">
          <div class="checkbox-custom">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <span class="checkbox-label">Capture full page</span>
        </label>
        <div style="height: 12px;"></div>
        <label class="checkbox-wrapper">
          <input type="checkbox" id="newSendWebhook" checked>
          <div class="checkbox-custom">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <span class="checkbox-label">Send to webhook</span>
        </label>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeNewTestModal()">Cancel</button>
        <button class="btn btn-primary" onclick="createAndRunTest()">Create & Run</button>
      </div>
    </div>
  </div>

  <!-- Loading Overlay -->
  <div class="loading-overlay" id="loadingOverlay">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <div class="loading-text">Taking screenshot...</div>
    </div>
  </div>

  <script>
    function openEditor(testName) {
      document.getElementById('editorPanel').style.display = 'flex';
      document.getElementById('editorTitle').textContent = testName;
      document.getElementById('editTestName').value = testName;
      document.getElementById('editorResult').className = 'result-preview';
      document.getElementById('editorResult').innerHTML = '';
    }

    function closeEditor() {
      document.getElementById('editorPanel').style.display = 'none';
    }

    function openNewTestModal() {
      document.getElementById('newTestModal').classList.add('active');
    }

    function closeNewTestModal() {
      document.getElementById('newTestModal').classList.remove('active');
    }

    function showLoading() {
      document.getElementById('loadingOverlay').classList.add('active');
    }

    function hideLoading() {
      document.getElementById('loadingOverlay').classList.remove('active');
    }

    async function runTest() {
      const url = document.getElementById('editTestUrl').value;
      const testName = document.getElementById('editTestName').value;
      const fullPage = document.getElementById('editFullPage').checked;
      const sendWebhook = document.getElementById('editSendWebhook').checked;

      if (!url) {
        alert('Please enter a URL');
        return;
      }

      showLoading();

      try {
        const response = await fetch('/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, testName, fullPage, sendWebhook })
        });

        const data = await response.json();
        const resultDiv = document.getElementById('editorResult');

        if (data.success) {
          resultDiv.className = 'result-preview active success';
          resultDiv.innerHTML = \`
            <div class="result-message">
              <div class="result-icon success">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div class="result-text">
                <h3>Test Passed</h3>
                <p>Screenshot captured\${data.webhookSent ? ' and sent to webhook' : ''}</p>
              </div>
            </div>
            <div class="screenshot-preview">
              <img src="data:image/png;base64,\${data.screenshot}" alt="Screenshot">
            </div>
          \`;
        } else {
          resultDiv.className = 'result-preview active error';
          resultDiv.innerHTML = \`
            <div class="result-message">
              <div class="result-icon error">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </div>
              <div class="result-text">
                <h3>Test Failed</h3>
                <p>\${data.error}</p>
              </div>
            </div>
          \`;
        }
      } catch (err) {
        const resultDiv = document.getElementById('editorResult');
        resultDiv.className = 'result-preview active error';
        resultDiv.innerHTML = \`
          <div class="result-message">
            <div class="result-icon error">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>
            <div class="result-text">
              <h3>Error</h3>
              <p>\${err.message}</p>
            </div>
          </div>
        \`;
      }

      hideLoading();
    }

    async function createAndRunTest() {
      const url = document.getElementById('newTestUrl').value;
      const testName = document.getElementById('newTestName').value;
      const fullPage = document.getElementById('newFullPage').checked;
      const sendWebhook = document.getElementById('newSendWebhook').checked;

      if (!url || !testName) {
        alert('Please fill in all fields');
        return;
      }

      closeNewTestModal();
      showLoading();

      try {
        const response = await fetch('/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, testName, fullPage, sendWebhook })
        });

        const data = await response.json();
        hideLoading();

        if (data.success) {
          // Add new test card
          const grid = document.getElementById('testsGrid');
          const card = document.createElement('div');
          card.className = 'test-card';
          card.onclick = () => openEditor(testName);
          card.innerHTML = \`
            <div class="test-card-header">
              <div>
                <div class="test-name">\${testName}</div>
                <div class="test-url">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                  </svg>
                  \${new URL(url).hostname}
                </div>
              </div>
              <span class="test-status passed">Passed</span>
            </div>
            <div class="test-meta">
              <div class="test-meta-item">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                </svg>
                3 steps
              </div>
              <div class="test-meta-item">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                1.5s
              </div>
              <div class="test-meta-item">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                Just now
              </div>
            </div>
          \`;
          grid.insertBefore(card, grid.firstChild);

          // Open editor with result
          openEditor(testName);
          document.getElementById('editTestUrl').value = url;
          document.getElementById('editFullPage').checked = fullPage;
          document.getElementById('editSendWebhook').checked = sendWebhook;

          const resultDiv = document.getElementById('editorResult');
          resultDiv.className = 'result-preview active success';
          resultDiv.innerHTML = \`
            <div class="result-message">
              <div class="result-icon success">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div class="result-text">
                <h3>Test Created & Passed</h3>
                <p>Screenshot captured\${data.webhookSent ? ' and sent to webhook' : ''}</p>
              </div>
            </div>
            <div class="screenshot-preview">
              <img src="data:image/png;base64,\${data.screenshot}" alt="Screenshot">
            </div>
          \`;
        } else {
          alert('Error: ' + data.error);
        }
      } catch (err) {
        hideLoading();
        alert('Error: ' + err.message);
      }
    }

    // Close modal on outside click
    document.getElementById('newTestModal').addEventListener('click', (e) => {
      if (e.target.id === 'newTestModal') closeNewTestModal();
    });
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, \`http://localhost:\${PORT}\`);

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
  console.log(\`QA Studio running at http://localhost:\${PORT}\`);
});
