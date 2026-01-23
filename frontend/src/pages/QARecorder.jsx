import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Play,
  Square,
  Camera,
  CheckCircle,
  Clock,
  Plus,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Trash2,
  GripVertical,
  Settings,
  Calendar,
  PlayCircle,
  Save,
  X,
  MousePointer,
  Type,
  ArrowUpDown,
  Eye,
  Loader2,
  Globe,
  AlertCircle,
  Check,
  MoreVertical,
  Edit2,
  Copy
} from 'lucide-react'
import { tests, runs, schedules, proxy } from '../lib/api'

// Step type icons
const stepIcons = {
  click: MousePointer,
  type: Type,
  scroll: ArrowUpDown,
  screenshot: Camera,
  verify: CheckCircle,
  wait: Clock,
  navigate: Globe
}

// Step type colors
const stepColors = {
  click: 'text-blue-400',
  type: 'text-green-400',
  scroll: 'text-yellow-400',
  screenshot: 'text-purple-400',
  verify: 'text-cyan-400',
  wait: 'text-orange-400',
  navigate: 'text-pink-400'
}

export default function QARecorder() {
  // Left sidebar state
  const [savedTests, setSavedTests] = useState([])
  const [folders, setFolders] = useState([])
  const [expandedFolders, setExpandedFolders] = useState({})
  const [selectedTest, setSelectedTest] = useState(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  // Center panel state
  const [url, setUrl] = useState('')
  const [loadedUrl, setLoadedUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [iframeError, setIframeError] = useState(null)
  const iframeRef = useRef(null)

  // Right sidebar state
  const [isRecording, setIsRecording] = useState(false)
  const [steps, setSteps] = useState([])
  const [testName, setTestName] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [runStatus, setRunStatus] = useState(null)

  // Drag and drop state
  const [draggedStep, setDraggedStep] = useState(null)

  // Load saved tests on mount
  useEffect(() => {
    loadSavedTests()
  }, [])

  const loadSavedTests = async () => {
    try {
      const data = await tests.list()
      setSavedTests(data.tests || [])

      // Group by folder (suite)
      const folderMap = {}
      data.tests?.forEach(test => {
        const folderId = test.suite_id || 'unsorted'
        if (!folderMap[folderId]) {
          folderMap[folderId] = {
            id: folderId,
            name: folderId === 'unsorted' ? 'Unsorted Tests' : `Folder ${folderId.slice(0, 8)}`,
            tests: []
          }
        }
        folderMap[folderId].tests.push(test)
      })
      setFolders(Object.values(folderMap))
    } catch (err) {
      console.error('Failed to load tests:', err)
    }
  }

  // Load URL in iframe via proxy
  const handleLoadUrl = () => {
    if (!url.trim()) return

    let targetUrl = url.trim()
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }

    setIsLoading(true)
    setIframeError(null)
    setLoadedUrl(targetUrl)

    // Add navigate step if recording
    if (isRecording) {
      addStep({
        type: 'navigate',
        url: targetUrl,
        description: `Navigate to ${targetUrl}`
      })
    }
  }

  const handleIframeLoad = () => {
    setIsLoading(false)
    if (isRecording && iframeRef.current) {
      injectRecordingScript()
    }
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setIframeError('Failed to load the website. The site may block iframe embedding.')
  }

  // Inject recording script into iframe
  const injectRecordingScript = () => {
    // Note: Due to cross-origin restrictions, we use postMessage for communication
    // The proxy server injects the recording script
    try {
      const iframe = iframeRef.current
      if (iframe && iframe.contentWindow) {
        // Send message to iframe to start recording
        iframe.contentWindow.postMessage({ type: 'START_RECORDING' }, '*')
      }
    } catch (err) {
      console.error('Could not inject recording script:', err)
    }
  }

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'RECORDED_ACTION') {
        if (isRecording) {
          addStep(event.data.action)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isRecording])

  // Recording controls
  const startRecording = () => {
    setIsRecording(true)
    if (iframeRef.current) {
      injectRecordingScript()
    }
  }

  const stopRecording = () => {
    setIsRecording(false)
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'STOP_RECORDING' }, '*')
    }
  }

  // Add a step to the list
  const addStep = (step) => {
    setSteps(prev => [...prev, {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      ...step
    }])
  }

  // Delete a step
  const deleteStep = (stepId) => {
    setSteps(prev => prev.filter(s => s.id !== stepId))
  }

  // Reorder steps via drag and drop
  const handleDragStart = (e, index) => {
    setDraggedStep(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedStep === null || draggedStep === index) return

    const newSteps = [...steps]
    const draggedItem = newSteps[draggedStep]
    newSteps.splice(draggedStep, 1)
    newSteps.splice(index, 0, draggedItem)
    setSteps(newSteps)
    setDraggedStep(index)
  }

  const handleDragEnd = () => {
    setDraggedStep(null)
  }

  // Action buttons
  const takeScreenshot = async () => {
    if (!loadedUrl) return

    try {
      // Capture screenshot using Browserless
      const result = await proxy.screenshot(loadedUrl, false)

      addStep({
        type: 'screenshot',
        description: 'Capture screenshot',
        fullPage: false,
        screenshotPath: result.path
      })
    } catch (err) {
      console.error('Screenshot failed:', err)
      // Still add the step even if screenshot fails (will be captured during run)
      addStep({
        type: 'screenshot',
        description: 'Capture screenshot',
        fullPage: false
      })
    }
  }

  const addVerifyStep = () => {
    addStep({
      type: 'verify',
      selector: '',
      assertType: 'exists',
      description: 'Verify element exists'
    })
  }

  const addWaitStep = () => {
    addStep({
      type: 'wait',
      duration: 1000,
      description: 'Wait 1 second'
    })
  }

  // Save test
  const handleSaveTest = async () => {
    if (!testName.trim()) return

    try {
      const testData = {
        name: testName,
        description: `Test recorded on ${new Date().toLocaleDateString()}`,
        base_url: loadedUrl || url,
        steps: steps.map(s => ({
          type: s.type,
          selector: s.selector,
          value: s.value,
          url: s.url,
          duration: s.duration,
          assertType: s.assertType,
          description: s.description,
          fullPage: s.fullPage
        })),
        status: 'active'
      }

      if (selectedTest) {
        await tests.update(selectedTest.id, testData)
      } else {
        await tests.create(testData)
      }

      setShowSaveModal(false)
      setTestName('')
      loadSavedTests()
    } catch (err) {
      console.error('Failed to save test:', err)
      alert('Failed to save test: ' + err.message)
    }
  }

  // Load a test
  const loadTest = (test) => {
    setSelectedTest(test)
    setSteps(test.steps?.map((s, i) => ({ ...s, id: Date.now() + i })) || [])
    if (test.base_url) {
      setUrl(test.base_url)
      setLoadedUrl(test.base_url)
    }
  }

  // Run test
  const runTest = async () => {
    if (steps.length === 0) return

    setIsRunning(true)
    setRunStatus({ status: 'running', message: 'Running test...' })

    try {
      // If we have a selected test, run it
      if (selectedTest) {
        const result = await runs.create({ test_id: selectedTest.id })
        setRunStatus({ status: 'success', message: 'Test started!', runId: result.run?.id })
      } else {
        // Create a temporary test and run it
        const testData = {
          name: `Quick Test ${new Date().toLocaleTimeString()}`,
          base_url: loadedUrl || url,
          steps: steps,
          status: 'active'
        }
        const newTest = await tests.create(testData)
        const result = await runs.create({ test_id: newTest.test.id })
        setRunStatus({ status: 'success', message: 'Test started!', runId: result.run?.id })
      }
    } catch (err) {
      console.error('Failed to run test:', err)
      setRunStatus({ status: 'error', message: err.message })
    } finally {
      setIsRunning(false)
    }
  }

  // Run all tests
  const runAllTests = async () => {
    try {
      for (const test of savedTests) {
        await runs.create({ test_id: test.id })
      }
      alert(`Started running ${savedTests.length} tests`)
    } catch (err) {
      console.error('Failed to run all tests:', err)
      alert('Failed to run tests: ' + err.message)
    }
  }

  // Toggle folder expansion
  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }))
  }

  // New test
  const newTest = () => {
    setSelectedTest(null)
    setSteps([])
    setUrl('')
    setLoadedUrl('')
    setIsRecording(false)
  }

  return (
    <div className="h-screen flex bg-gray-950 text-gray-100">
      {/* Left Sidebar - Test List */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            QA Recorder
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="p-3 space-y-2 border-b border-gray-800">
          <button
            onClick={newTest}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Test
          </button>
          <button
            onClick={runAllTests}
            disabled={savedTests.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlayCircle className="w-4 h-4" />
            Run All
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg font-medium transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Schedule
          </button>
        </div>

        {/* Test List */}
        <div className="flex-1 overflow-y-auto p-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Saved Tests
          </h3>

          {folders.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No tests yet. Create your first test!
            </p>
          ) : (
            <div className="space-y-1">
              {folders.map(folder => (
                <div key={folder.id}>
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded-lg text-left"
                  >
                    {expandedFolders[folder.id] ? (
                      <>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                        <FolderOpen className="w-4 h-4 text-primary-400" />
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                        <Folder className="w-4 h-4 text-primary-400" />
                      </>
                    )}
                    <span className="text-sm text-gray-300 truncate flex-1">
                      {folder.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {folder.tests.length}
                    </span>
                  </button>

                  {expandedFolders[folder.id] && (
                    <div className="ml-4 mt-1 space-y-1">
                      {folder.tests.map(test => (
                        <button
                          key={test.id}
                          onClick={() => loadTest(test)}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors ${
                            selectedTest?.id === test.id
                              ? 'bg-primary-600/20 text-primary-300'
                              : 'hover:bg-gray-800 text-gray-400'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${
                            test.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                          }`} />
                          <span className="text-sm truncate">{test.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center Panel - URL Bar & Iframe */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* URL Bar */}
        <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-3">
          <Globe className="w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
            placeholder="Enter URL to test (e.g., https://example.com)"
            className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            onClick={handleLoadUrl}
            disabled={!url.trim() || isLoading}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Load
          </button>
        </div>

        {/* Iframe Container */}
        <div className="flex-1 bg-gray-950 relative">
          {!loadedUrl ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <Globe className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">Enter a URL above to start testing</p>
              <p className="text-sm mt-2">The website will load here</p>
            </div>
          ) : iframeError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <AlertCircle className="w-16 h-16 mb-4 text-red-400 opacity-50" />
              <p className="text-lg text-red-400">{iframeError}</p>
              <p className="text-sm mt-2">Try using the proxy or check the URL</p>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 z-10">
                  <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={`/api/proxy?url=${encodeURIComponent(loadedUrl)}`}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />

              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-medium animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  Recording
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Sidebar - Recording Controls */}
      <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
        {/* Recording Controls */}
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Recording
          </h3>
          <div className="flex gap-2">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={!loadedUrl}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-3 h-3 bg-white rounded-full" />
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Recording
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Actions
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={takeScreenshot}
              className="flex flex-col items-center gap-1 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors group"
            >
              <Camera className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
              <span className="text-xs text-gray-400 group-hover:text-gray-300">Screenshot</span>
            </button>
            <button
              onClick={addVerifyStep}
              className="flex flex-col items-center gap-1 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors group"
            >
              <CheckCircle className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300" />
              <span className="text-xs text-gray-400 group-hover:text-gray-300">Verify</span>
            </button>
            <button
              onClick={addWaitStep}
              className="flex flex-col items-center gap-1 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors group"
            >
              <Clock className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />
              <span className="text-xs text-gray-400 group-hover:text-gray-300">Wait</span>
            </button>
          </div>
        </div>

        {/* Steps List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Steps ({steps.length})
            </h3>
            {steps.length > 0 && (
              <button
                onClick={() => setSteps([])}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {steps.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {isRecording
                ? 'Interact with the page to record steps'
                : 'Start recording or add steps manually'}
            </p>
          ) : (
            <div className="space-y-2">
              {steps.map((step, index) => {
                const IconComponent = stepIcons[step.type] || MousePointer
                const colorClass = stepColors[step.type] || 'text-gray-400'

                return (
                  <div
                    key={step.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 p-2 bg-gray-800 rounded-lg group cursor-move ${
                      draggedStep === index ? 'opacity-50' : ''
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                    <span className="text-xs text-gray-500 w-5">{index + 1}</span>
                    <IconComponent className={`w-4 h-4 ${colorClass}`} />
                    <span className="flex-1 text-sm text-gray-300 truncate">
                      {step.description || step.type}
                    </span>
                    <button
                      onClick={() => deleteStep(step.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-400" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Run Status */}
        {runStatus && (
          <div className={`mx-4 mb-4 p-3 rounded-lg ${
            runStatus.status === 'running' ? 'bg-blue-900/30 border border-blue-700' :
            runStatus.status === 'success' ? 'bg-green-900/30 border border-green-700' :
            'bg-red-900/30 border border-red-700'
          }`}>
            <div className="flex items-center gap-2">
              {runStatus.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
              {runStatus.status === 'success' && <Check className="w-4 h-4 text-green-400" />}
              {runStatus.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
              <span className={`text-sm ${
                runStatus.status === 'running' ? 'text-blue-300' :
                runStatus.status === 'success' ? 'text-green-300' :
                'text-red-300'
              }`}>
                {runStatus.message}
              </span>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={steps.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Save Test
          </button>
          <button
            onClick={runTest}
            disabled={steps.length === 0 || isRunning}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run Test
          </button>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Save Test</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1 hover:bg-gray-800 rounded"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Enter test name"
              className="w-full bg-gray-800 text-white px-4 py-2.5 rounded-lg border border-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTest}
                disabled={!testName.trim()}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal onClose={() => setShowScheduleModal(false)} tests={savedTests} />
      )}
    </div>
  )
}

// Schedule Modal Component
function ScheduleModal({ onClose, tests }) {
  const [selectedTestId, setSelectedTestId] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [time, setTime] = useState('09:00')
  const [isLoading, setIsLoading] = useState(false)

  const handleCreate = async () => {
    if (!selectedTestId) return

    setIsLoading(true)
    try {
      // Convert to cron expression
      const [hours, minutes] = time.split(':')
      let cronExpression = ''
      switch (frequency) {
        case 'hourly':
          cronExpression = `${minutes} * * * *`
          break
        case 'daily':
          cronExpression = `${minutes} ${hours} * * *`
          break
        case 'weekly':
          cronExpression = `${minutes} ${hours} * * 1`
          break
        case 'monthly':
          cronExpression = `${minutes} ${hours} 1 * *`
          break
        default:
          cronExpression = `${minutes} ${hours} * * *`
      }

      await schedules.create({
        test_id: selectedTestId,
        cron_expression: cronExpression,
        is_active: true
      })

      onClose()
    } catch (err) {
      console.error('Failed to create schedule:', err)
      alert('Failed to create schedule: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Schedule Test</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Select Test</label>
            <select
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-2.5 rounded-lg border border-gray-700 focus:border-primary-500 focus:outline-none"
            >
              <option value="">Choose a test...</option>
              {tests.map(test => (
                <option key={test.id} value={test.id}>{test.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-2.5 rounded-lg border border-gray-700 focus:border-primary-500 focus:outline-none"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-2.5 rounded-lg border border-gray-700 focus:border-primary-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedTestId || isLoading}
            className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Schedule
          </button>
        </div>
      </div>
    </div>
  )
}
