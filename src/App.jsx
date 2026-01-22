import { useState, useCallback } from 'react';
import { Play, Save, Trash2, CheckCircle, XCircle, Globe, MousePointer, Keyboard, Navigation, Clock, Loader2, Camera, Plus, Bot, Settings, Image, AlertTriangle, GitCompare, Download, Layers, RefreshCw } from 'lucide-react';

export default function QAAgent() {
  const [url, setUrl] = useState('https://luckie.com');
  const [productionUrl, setProductionUrl] = useState('');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [showSettings, setShowSettings] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [stagingScreenshot, setStagingScreenshot] = useState(null);
  const [productionScreenshot, setProductionScreenshot] = useState(null);
  const [currentView, setCurrentView] = useState('staging');
  const [showDiff, setShowDiff] = useState(false);
  const [diffOpacity, setDiffOpacity] = useState(0.5);
  const [steps, setSteps] = useState([]);
  const [newStepText, setNewStepText] = useState('');
  const [executionLog, setExecutionLog] = useState([]);
  const [savedTests, setSavedTests] = useState([]);
  const [testName, setTestName] = useState('');
  const [activeTab, setActiveTab] = useState('build');
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [stepScreenshots, setStepScreenshots] = useState({});
  const [error, setError] = useState(null);

  const addLog = useCallback((msg, type = 'info') => {
    setExecutionLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  }, []);

  const takeScreenshot = async (targetUrl, fullPage = false) => {
    if (!n8nWebhookUrl) {
      throw new Error('n8n webhook URL required - add it in Settings');
    }
    addLog(`📸 Requesting screenshot from n8n...`, 'info');
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl, fullPage })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`n8n error: ${text.substring(0, 100)}`);
    }
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Screenshot failed');
    return data.screenshot;
  };

  const loadStagingSite = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setError(null);
    addLog(`🌐 Capturing staging: ${url}`, 'info');
    try {
      const screenshot = await takeScreenshot(url);
      setStagingScreenshot(screenshot);
      setCurrentView('staging');
      setShowDiff(false);
      addLog(`✓ Staging captured!`, 'success');
      if (steps.length === 0) addStep('navigate', { value: url, description: `Navigate to ${url}` });
    } catch (err) {
      setError(err.message);
      addLog(`✗ ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductionSite = async () => {
    if (!productionUrl.trim()) return;
    setIsLoading(true);
    setError(null);
    addLog(`🌐 Capturing production: ${productionUrl}`, 'info');
    try {
      const screenshot = await takeScreenshot(productionUrl);
      setProductionScreenshot(screenshot);
      setCurrentView('production');
      setShowDiff(false);
      addLog(`✓ Production captured!`, 'success');
    } catch (err) {
      setError(err.message);
      addLog(`✗ ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const compareSites = async () => {
    if (!url.trim() || !productionUrl.trim()) return;
    setIsLoading(true);
    setError(null);
    addLog(`🔄 Capturing both for comparison...`, 'info');
    try {
      const [staging, production] = await Promise.all([
        takeScreenshot(url),
        takeScreenshot(productionUrl)
      ]);
      setStagingScreenshot(staging);
      setProductionScreenshot(production);
      setShowDiff(true);
      addLog(`✓ Both captured! Use overlay to compare.`, 'success');
    } catch (err) {
      setError(err.message);
      addLog(`✗ ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addStep = (action, details = {}) => {
    setSteps(prev => [...prev, { id: Date.now(), action, status: 'pending', ...details }]);
  };

  const parseAndAddStep = () => {
    if (!newStepText.trim()) return;
    const text = newStepText.trim();
    const lower = text.toLowerCase();
    let step = { text, description: text };
    if (lower.includes('navigate') || lower.includes('go to')) {
      const match = text.match(/https?:\/\/[^\s]+/);
      step = { ...step, action: 'navigate', value: match?.[0] || url };
    } else if (lower.includes('click')) {
      step = { ...step, action: 'click', selector: text.replace(/click\s+(on\s+)?(the\s+)?/i, '').trim() };
    } else if (lower.includes('type') || lower.includes('enter')) {
      const match = text.match(/"([^"]+)"|'([^']+)'/);
      step = { ...step, action: 'type', value: match?.[1] || match?.[2] || '' };
    } else if (lower.includes('screenshot')) {
      step = { ...step, action: 'screenshot' };
    } else if (lower.includes('verify') || lower.includes('check')) {
      step = { ...step, action: 'verify', selector: text.replace(/verify|check|that|page|shows?|contains?/gi, '').trim() };
    } else if (lower.includes('wait')) {
      const sec = text.match(/(\d+)/);
      step = { ...step, action: 'wait', value: sec ? parseInt(sec[1]) * 1000 : 2000 };
    } else {
      step = { ...step, action: 'click', selector: text };
    }
    addStep(step.action, step);
    setNewStepText('');
  };

  const runTest = async () => {
    if (steps.length === 0 || !n8nWebhookUrl) return;
    setIsRunning(true);
    setExecutionLog([]);
    setStepScreenshots({});
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));
    const targetUrl = productionUrl || url;
    addLog(`🚀 Running test on ${targetUrl}`, 'info');
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setCurrentStepIndex(i);
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s));
      addLog(`▶ Step ${i + 1}: ${step.description}`, 'step');
      try {
        let screenshot;
        if (step.action === 'wait') {
          await new Promise(r => setTimeout(r, step.value || 2000));
        } else {
          screenshot = await takeScreenshot(step.value || targetUrl, step.action === 'screenshot');
          setStagingScreenshot(screenshot);
          setStepScreenshots(prev => ({ ...prev, [step.id]: screenshot }));
        }
        addLog(`   ✓ Passed`, 'success');
        setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'passed' } : s));
      } catch (err) {
        addLog(`   ✗ ${err.message}`, 'error');
        setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'failed' } : s));
      }
    }
    setCurrentStepIndex(-1);
    setIsRunning(false);
    const passed = steps.filter(s => s.status === 'passed').length;
    addLog(`📊 Done: ${passed}/${steps.length} passed`, passed === steps.length ? 'success' : 'warning');
  };

  const saveTest = () => {
    if (!testName.trim() || steps.length === 0) return;
    setSavedTests(prev => [...prev, { id: Date.now(), name: testName, url, productionUrl, steps: steps.map(({ action, selector, value, description }) => ({ action, selector, value, description })) }]);
    setTestName('');
  };

  const loadTest = (test) => {
    setUrl(test.url);
    setProductionUrl(test.productionUrl || '');
    setSteps(test.steps.map((s, i) => ({ ...s, id: Date.now() + i, status: 'pending' })));
    setActiveTab('build');
  };

  const getStatusBadge = (step, idx) => {
    if (currentStepIndex === idx) return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
    if (step.status === 'passed') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (step.status === 'failed') return <XCircle className="w-4 h-4 text-red-400" />;
    return <div className="w-4 h-4 rounded-full border-2 border-slate-600" />;
  };

  const hasConfig = !!n8nWebhookUrl;
  const passedCount = steps.filter(s => s.status === 'passed').length;
  const failedCount = steps.filter(s => s.status === 'failed').length;

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col">
      <div className="bg-slate-900 border-b border-slate-800 p-2 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg">
          <Bot className="w-4 h-4" /><span className="font-semibold text-sm">QA Auto</span>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 max-w-xs relative">
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Staging URL" className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-violet-500" />
          </div>
          <button onClick={loadStagingSite} disabled={isLoading || !hasConfig} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium disabled:opacity-50">
            {isLoading && currentView === 'staging' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Capture
          </button>
          <div className="h-6 w-px bg-slate-700" />
          <div className="flex-1 max-w-xs relative">
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
            <input type="text" value={productionUrl} onChange={(e) => setProductionUrl(e.target.value)} placeholder="Production URL" className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <button onClick={compareSites} disabled={isLoading || !hasConfig || !productionUrl} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium disabled:opacity-50">
            <GitCompare className="w-4 h-4" /> Compare
          </button>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg ${showSettings ? 'bg-violet-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {showSettings && (
        <div className="bg-slate-900 border-b border-slate-800 p-4">
          <div className="max-w-2xl mx-auto">
            <label className="text-sm text-slate-400 mb-2 block">n8n Webhook URL *</label>
            <input type="text" value={n8nWebhookUrl} onChange={(e) => setN8nWebhookUrl(e.target.value)} placeholder="https://luckie.app.n8n.cloud/webhook/qa-screenshot" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-violet-500" />
            {!hasConfig ? (
              <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-amber-400 text-sm font-medium flex items-center gap-1 mb-2">
                  <AlertTriangle className="w-4 h-4" /> Setup Required
                </p>
                <ol className="text-slate-400 text-xs space-y-1 list-decimal list-inside">
                  <li>Get free API token from <a href="https://browserless.io" target="_blank" className="text-violet-400 underline">browserless.io</a></li>
                  <li>Import the n8n workflow and add your token</li>
                  <li>Activate the workflow and paste webhook URL above</li>
                </ol>
              </div>
            ) : (
              <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Ready! Click "Capture" to take screenshots
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col bg-slate-900">
          {error && <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2 text-sm text-red-400"><AlertTriangle className="w-4 h-4 inline mr-2" />{error}</div>}
          {(stagingScreenshot || productionScreenshot) && (
            <div className="bg-slate-800/50 px-4 py-2 flex items-center gap-3 border-b border-slate-700">
              <button onClick={() => { setCurrentView('staging'); setShowDiff(false); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${currentView === 'staging' && !showDiff ? 'bg-violet-600' : 'bg-slate-700 hover:bg-slate-600'}`}>Staging</button>
              {productionScreenshot && (
                <>
                  <button onClick={() => { setCurrentView('production'); setShowDiff(false); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${currentView === 'production' && !showDiff ? 'bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600'}`}>Production</button>
                  <button onClick={() => setShowDiff(!showDiff)} className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${showDiff ? 'bg-amber-600' : 'bg-slate-700 hover:bg-slate-600'}`}><Layers className="w-4 h-4" /> Overlay Diff</button>
                  {showDiff && (
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-slate-400">Opacity:</span>
                      <input type="range" min="0" max="1" step="0.05" value={diffOpacity} onChange={(e) => setDiffOpacity(parseFloat(e.target.value))} className="w-32" />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <div className="flex-1 bg-slate-950 flex items-center justify-center overflow-auto p-6">
            {stagingScreenshot || productionScreenshot ? (
              <div className="relative max-w-full">
                {showDiff && stagingScreenshot && productionScreenshot ? (
                  <div className="relative inline-block">
                    <img src={stagingScreenshot} alt="Staging" className="max-w-full max-h-[calc(100vh-280px)] rounded-lg border-2 border-violet-500/50" />
                    <img src={productionScreenshot} alt="Production" className="absolute inset-0 max-w-full max-h-[calc(100vh-280px)] rounded-lg border-2 border-emerald-500/50" style={{ opacity: diffOpacity, mixBlendMode: 'difference' }} />
                    <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs">Staging + Production overlay</div>
                  </div>
                ) : (
                  <img src={currentView === 'staging' ? stagingScreenshot : productionScreenshot} alt="Screenshot" className="max-w-full max-h-[calc(100vh-280px)] rounded-lg border border-slate-700 shadow-2xl" />
                )}
              </div>
            ) : (
              <div className="text-center">
                <Image className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-400 mb-2">No Screenshots Yet</h3>
                <p className="text-slate-500 text-sm">{hasConfig ? 'Enter a URL and click Capture' : 'Add your n8n webhook URL in Settings above'}</p>
              </div>
            )}
          </div>
          {Object.keys(stepScreenshots).length > 0 && (
            <div className="bg-slate-800/50 border-t border-slate-700 p-3 flex gap-2 overflow-x-auto">
              {Object.entries(stepScreenshots).map(([id, src]) => (
                <button key={id} onClick={() => { setStagingScreenshot(src); setCurrentView('staging'); setShowDiff(false); }} className="shrink-0 w-24 h-16 rounded-lg border-2 border-slate-600 overflow-hidden hover:border-violet-500 transition-colors">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
          <div className="flex border-b border-slate-800">
            {['build', 'saved', 'log'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 text-sm font-medium ${activeTab === tab ? 'text-violet-400 border-b-2 border-violet-400 bg-slate-800/50' : 'text-slate-400'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'build' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={newStepText} onChange={(e) => setNewStepText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && parseAndAddStep()} placeholder='e.g., "Click Login button"' className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                  <button onClick={parseAndAddStep} className="p-2 bg-violet-600 hover:bg-violet-500 rounded-lg"><Plus className="w-5 h-5" /></button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['Click', 'Type', 'Verify', 'Screenshot', 'Wait'].map(a => (
                    <button key={a} onClick={() => setNewStepText(a + ' ')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs">{a}</button>
                  ))}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {steps.map((step, idx) => (
                    <div key={step.id} onClick={() => stepScreenshots[step.id] && setStagingScreenshot(stepScreenshots[step.id])} className={`p-2.5 rounded-lg border text-sm cursor-pointer ${currentStepIndex === idx ? 'bg-violet-500/10 border-violet-500/50' : step.status === 'passed' ? 'border-emerald-500/30 bg-emerald-500/5' : step.status === 'failed' ? 'border-red-500/30 bg-red-500/5' : 'border-slate-700 hover:border-slate-600'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">{idx + 1}</span>
                        {getStatusBadge(step, idx)}
                        <span className="flex-1 truncate">{step.description}</span>
                        {stepScreenshots[step.id] && <Camera className="w-3 h-3 text-violet-400" />}
                        <button onClick={(e) => { e.stopPropagation(); setSteps(prev => prev.filter(s => s.id !== step.id)); }} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                {(passedCount > 0 || failedCount > 0) && (
                  <div className="flex gap-2">
                    <div className="flex-1 p-2 bg-emerald-500/10 rounded-lg text-center text-sm"><span className="font-bold text-emerald-400">{passedCount}</span> passed</div>
                    <div className="flex-1 p-2 bg-red-500/10 rounded-lg text-center text-sm"><span className="font-bold text-red-400">{failedCount}</span> failed</div>
                  </div>
                )}
                <button onClick={runTest} disabled={isRunning || steps.length === 0 || !hasConfig} className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} {isRunning ? 'Running...' : 'Run Test'}
                </button>
                <div className="flex gap-2">
                  <input type="text" value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="Test name..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                  <button onClick={saveTest} disabled={!testName || !steps.length} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg disabled:opacity-50"><Save className="w-5 h-5" /></button>
                </div>
              </div>
            )}
            {activeTab === 'saved' && (
              <div className="space-y-2">
                {savedTests.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">No saved tests</p> : savedTests.map(test => (
                  <div key={test.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="font-medium">{test.name}</p>
                    <p className="text-xs text-slate-500 truncate mt-1">{test.url}</p>
                    <button onClick={() => loadTest(test)} className="mt-2 w-full py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm flex items-center justify-center gap-1"><Play className="w-4 h-4" /> Load</button>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'log' && (
              <div className="font-mono text-xs space-y-1">
                {executionLog.length === 0 ? <p className="text-slate-500 text-center py-8">No logs yet</p> : executionLog.map((log, i) => (
                  <div key={i} className={log.type === 'success' ? 'text-emerald-400' : log.type === 'error' ? 'text-red-400' : log.type === 'step' ? 'text-violet-300' : 'text-slate-400'}>{log.msg}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}