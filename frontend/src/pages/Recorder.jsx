import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Circle,
  Square,
  Save,
  Trash2,
  Play,
  MousePointer,
  Type,
  Navigation,
  Clock,
  AlertCircle,
  Info
} from 'lucide-react'
import { tests } from '../lib/api'

export default function Recorder() {
  const navigate = useNavigate()
  const [isRecording, setIsRecording] = useState(false)
  const [targetUrl, setTargetUrl] = useState('')
  const [testName, setTestName] = useState('')
  const [recordedSteps, setRecordedSteps] = useState([])
  const [showInstructions, setShowInstructions] = useState(true)

  // Manual step addition for demo purposes
  // In production, this would connect to a browser extension or injected script
  function addStep(type) {
    const step = {
      type,
      selector: '',
      value: '',
      description: '',
      timestamp: Date.now()
    }

    switch (type) {
      case 'navigate':
        step.url = targetUrl
        step.description = `Navigate to ${targetUrl}`
        break
      case 'click':
        step.selector = prompt('Enter CSS selector for click:') || ''
        step.description = `Click on ${step.selector}`
        break
      case 'type':
        step.selector = prompt('Enter CSS selector for input:') || ''
        step.value = prompt('Enter text to type:') || ''
        step.description = `Type "${step.value}" into ${step.selector}`
        break
      case 'wait':
        step.duration = parseInt(prompt('Wait duration (ms):') || '1000')
        step.description = `Wait for ${step.duration}ms`
        break
      case 'assert':
        step.selector = prompt('Enter CSS selector to assert:') || ''
        step.assertType = 'visible'
        step.description = `Assert ${step.selector} is visible`
        break
      default:
        break
    }

    if (step.selector || step.url || step.duration) {
      setRecordedSteps([...recordedSteps, step])
    }
  }

  function removeStep(index) {
    setRecordedSteps(recordedSteps.filter((_, i) => i !== index))
  }

  function clearSteps() {
    if (confirm('Are you sure you want to clear all recorded steps?')) {
      setRecordedSteps([])
    }
  }

  async function saveTest() {
    if (!testName) {
      alert('Please enter a test name')
      return
    }

    if (recordedSteps.length === 0) {
      alert('Please add at least one step')
      return
    }

    try {
      const newTest = await tests.create({
        name: testName,
        description: `Recorded test from ${targetUrl}`,
        base_url: targetUrl,
        steps: recordedSteps.map(({ timestamp, ...step }) => step)
      })
      navigate(`/tests/${newTest.id}`)
    } catch (error) {
      alert('Failed to save test: ' + error.message)
    }
  }

  function startRecording() {
    if (!targetUrl) {
      alert('Please enter a target URL')
      return
    }
    setIsRecording(true)
    // Add initial navigation step
    setRecordedSteps([{
      type: 'navigate',
      url: targetUrl,
      description: `Navigate to ${targetUrl}`
    }])
  }

  function stopRecording() {
    setIsRecording(false)
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      {showInstructions && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800">How to use the Recorder</h3>
                <p className="text-blue-600 mt-1 text-sm">
                  Enter your target URL and click "Start Recording". Then use the action buttons
                  to add steps to your test. For a full recording experience with automatic
                  element detection, install the browser extension.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowInstructions(false)}
              className="text-blue-500 hover:text-blue-700"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Recorder</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Name
              </label>
              <input
                type="text"
                className="input"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g., Login Flow Test"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target URL
              </label>
              <input
                type="url"
                className="input"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isRecording}
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="btn btn-danger flex items-center"
              >
                <Circle className="w-5 h-5 mr-2 fill-current" />
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="btn btn-secondary flex items-center"
              >
                <Square className="w-5 h-5 mr-2 fill-current" />
                Stop Recording
              </button>
            )}

            {recordedSteps.length > 0 && (
              <>
                <button onClick={saveTest} className="btn btn-success flex items-center">
                  <Save className="w-5 h-5 mr-2" />
                  Save Test
                </button>
                <button onClick={clearSteps} className="btn btn-secondary flex items-center">
                  <Trash2 className="w-5 h-5 mr-2" />
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isRecording && (
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Add Action</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => addStep('click')}
              className="btn btn-secondary flex items-center"
            >
              <MousePointer className="w-4 h-4 mr-2" />
              Click
            </button>
            <button
              onClick={() => addStep('type')}
              className="btn btn-secondary flex items-center"
            >
              <Type className="w-4 h-4 mr-2" />
              Type
            </button>
            <button
              onClick={() => addStep('navigate')}
              className="btn btn-secondary flex items-center"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Navigate
            </button>
            <button
              onClick={() => addStep('wait')}
              className="btn btn-secondary flex items-center"
            >
              <Clock className="w-4 h-4 mr-2" />
              Wait
            </button>
            <button
              onClick={() => addStep('assert')}
              className="btn btn-secondary flex items-center"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Assert
            </button>
          </div>
        </div>
      )}

      {/* Recorded Steps */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recorded Steps ({recordedSteps.length})
        </h2>

        {recordedSteps.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Circle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {isRecording
                ? 'Use the action buttons above to add steps'
                : 'Start recording to capture test steps'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recordedSteps.map((step, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 capitalize">{step.type}</span>
                      {step.selector && (
                        <code className="text-sm bg-gray-200 px-2 py-0.5 rounded">
                          {step.selector}
                        </code>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-sm text-gray-500">{step.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeStep(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Browser Extension Info */}
      <div className="card bg-gray-50">
        <h3 className="font-medium text-gray-900 mb-2">Want automatic recording?</h3>
        <p className="text-sm text-gray-600 mb-4">
          For automatic element detection and click recording, you can use our bookmarklet
          or browser extension. The extension will automatically capture your clicks and
          keystrokes as you interact with your website.
        </p>
        <div className="flex items-center space-x-4">
          <a
            href="#"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Install Chrome Extension
          </a>
          <a
            href="#"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Get Bookmarklet
          </a>
        </div>
      </div>
    </div>
  )
}
