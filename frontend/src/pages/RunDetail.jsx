import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Image,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play
} from 'lucide-react'
import { runs } from '../lib/api'

export default function RunDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedSteps, setExpandedSteps] = useState(new Set())
  const [selectedScreenshot, setSelectedScreenshot] = useState(null)

  useEffect(() => {
    fetchRun()
    // Auto-refresh if running
    const interval = setInterval(() => {
      if (run?.status === 'running') {
        fetchRun()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [id])

  async function fetchRun() {
    try {
      const data = await runs.get(id)
      setRun(data)
    } catch (error) {
      console.error('Failed to fetch run:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRerun() {
    try {
      const newRun = await runs.rerun(id)
      navigate(`/runs/${newRun.id || id}`)
    } catch (error) {
      alert('Failed to rerun test: ' + error.message)
    }
  }

  function toggleStep(index) {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSteps(newExpanded)
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'visual_diff':
        return <Eye className="w-5 h-5 text-yellow-500" />
      case 'running':
        return <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-gray-400">
        <AlertCircle className="w-12 h-12 mb-4 text-gray-600" />
        <p className="text-lg">Run not found</p>
        <Link
          to="/"
          className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          Back to Recorder
        </Link>
      </div>
    )
  }

  const passedSteps = run.step_results?.filter(s => s.status === 'passed').length || 0
  const totalSteps = run.step_results?.length || run.test_steps?.length || 0

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white">{run.test_name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    run.status === 'passed'
                      ? 'bg-green-900/50 text-green-400 border border-green-700'
                      : run.status === 'failed'
                      ? 'bg-red-900/50 text-red-400 border border-red-700'
                      : run.status === 'running'
                      ? 'bg-blue-900/50 text-blue-400 border border-blue-700'
                      : 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
                  }`}
                >
                  {run.status}
                </span>
              </div>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                <span>
                  {run.duration_ms
                    ? `${(run.duration_ms / 1000).toFixed(2)}s`
                    : '-'}
                </span>
                <span>
                  {passedSteps}/{totalSteps} steps passed
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleRerun}
            disabled={run.status === 'running'}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Rerun Test
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Error Message */}
        {run.error_message && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <div className="flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-300">Error</h3>
                <p className="text-red-400 mt-1">{run.error_message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step Results */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Step Results
              </h2>

              {!run.step_results?.length && !run.test_steps?.length ? (
                <p className="text-gray-500 text-center py-8">No step data available</p>
              ) : (
                <div className="space-y-3">
                  {(run.step_results || run.test_steps || []).map((step, index) => {
                    const isExpanded = expandedSteps.has(index)
                    const testStep = run.test_steps?.[index]

                    return (
                      <div
                        key={index}
                        className="border border-gray-700 rounded-lg overflow-hidden"
                      >
                        <div
                          className="flex items-center justify-between p-4 bg-gray-800/50 cursor-pointer hover:bg-gray-800 transition-colors"
                          onClick={() => toggleStep(index)}
                        >
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(step.status)}
                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center font-medium text-gray-300">
                              {index + 1}
                            </div>
                            <div>
                              <span className="font-medium text-gray-200 capitalize">
                                {step.step_type || testStep?.type}
                              </span>
                              {step.duration_ms && (
                                <span className="ml-2 text-sm text-gray-500">
                                  ({step.duration_ms}ms)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {step.screenshot_path && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedScreenshot(step.screenshot_path)
                                }}
                                className="p-2 text-primary-400 hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                <Image className="w-4 h-4" />
                              </button>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 border-t border-gray-700 space-y-3 bg-gray-900">
                            {testStep?.selector && (
                              <div>
                                <span className="text-sm text-gray-500">Selector:</span>
                                <code className="ml-2 text-sm bg-gray-800 text-primary-400 px-2 py-1 rounded">
                                  {testStep.selector}
                                </code>
                              </div>
                            )}
                            {testStep?.value && (
                              <div>
                                <span className="text-sm text-gray-500">Value:</span>
                                <span className="ml-2 text-sm text-gray-300">{testStep.value}</span>
                              </div>
                            )}
                            {step.error_message && (
                              <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg">
                                <span className="text-sm text-red-400">
                                  {step.error_message}
                                </span>
                              </div>
                            )}
                            {step.visual_diff_percent !== null && (
                              <div className="p-3 bg-yellow-900/30 border border-yellow-800 rounded-lg">
                                <span className="text-sm text-yellow-400">
                                  Visual difference: {(step.visual_diff_percent * 100).toFixed(2)}%
                                </span>
                              </div>
                            )}
                            {step.screenshot_path && (
                              <div>
                                <img
                                  src={`/screenshots/${step.screenshot_path.split('/').pop()}`}
                                  alt={`Step ${index + 1}`}
                                  className="max-w-full rounded-lg border border-gray-700 cursor-pointer hover:border-primary-500 transition-colors"
                                  onClick={() => setSelectedScreenshot(step.screenshot_path)}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Run Details */}
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Details</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm text-gray-500">Test</dt>
                  <dd className="mt-1 text-primary-400">{run.test_name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        run.status === 'passed'
                          ? 'bg-green-900/50 text-green-400 border border-green-700'
                          : run.status === 'failed'
                          ? 'bg-red-900/50 text-red-400 border border-red-700'
                          : 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
                      }`}
                    >
                      {run.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Duration</dt>
                  <dd className="mt-1 text-sm text-gray-300">
                    {run.duration_ms
                      ? `${(run.duration_ms / 1000).toFixed(2)} seconds`
                      : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Started</dt>
                  <dd className="mt-1 text-sm text-gray-300">
                    {run.started_at
                      ? new Date(run.started_at).toLocaleString()
                      : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Completed</dt>
                  <dd className="mt-1 text-sm text-gray-300">
                    {run.completed_at
                      ? new Date(run.completed_at).toLocaleString()
                      : '-'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Screenshots */}
            {run.screenshots?.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Screenshots ({run.screenshots.length})
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {run.screenshots.map((screenshot, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedScreenshot(screenshot.path)}
                      className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all"
                    >
                      <img
                        src={`/screenshots/${screenshot.path.split('/').pop()}`}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2">
                        Step {screenshot.step_index + 1}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="max-w-6xl max-h-[90vh] overflow-auto">
            <img
              src={`/screenshots/${selectedScreenshot.split('/').pop()}`}
              alt="Screenshot"
              className="max-w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}
