# QA Auto - Setup Instructions

Visual QA testing tool with real browser screenshots and staging vs production comparison.

## Quick Setup (5 minutes)

### Step 1: Get Browserless.io Token (Free)

1. Go to [browserless.io](https://browserless.io)
2. Sign up for free
3. Copy your API token from the dashboard

### Step 2: Set Up n8n Workflow

1. Go to your n8n instance
2. Create new workflow → Import from JSON
3. Paste the content from `n8n-workflow.json`
4. Click on "Take Screenshot" node
5. Replace `PASTE_YOUR_BROWSERLESS_TOKEN_HERE` with your actual token
6. Save and **Activate** the workflow
7. Click on "Webhook" node → Copy the **Production URL**

### Step 3: Run the React App

```bash
# Create project
npm create vite@latest qa-auto -- --template react
cd qa-auto

# Install dependencies
npm install lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Replace src/App.jsx with App.jsx from this gist
# Update tailwind.config.js content array:
# content: ["./index.html", "./src/**/*.{js,jsx}"]

# Add to src/index.css:
# @tailwind base;
# @tailwind components;
# @tailwind utilities;

# Run
npm run dev
```

### Step 4: Configure & Use

1. Open app at `http://localhost:5173`
2. Paste your n8n webhook URL in Settings
3. Enter a URL and click **Capture**!

## Features

- 📸 Real browser screenshots via Browserless
- 🔄 Compare staging vs production with visual overlay
- 📝 Build test sequences with screenshots at each step
- 💾 Save and reload tests

## Tech Stack

- React + Vite
- Tailwind CSS
- n8n (workflow automation)
- Browserless.io (browser screenshots)