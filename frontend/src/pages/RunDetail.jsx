import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
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
  ChevronUp
} from 'lucide-react'
import { runs } from '../lib/api'

export default function RunDetail() {
  const { id } = useParams()
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
      window.location.href = `/runs/${newRun.id || id}`
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
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Run not found</p>
        <Link to="/runs" className="btn btn-primary mt-4">
          Back to Runs
        </Link>
      </div>
    )
  }

  const passedSteps = run.step_results?.filter(s => s.status === 'passed').length || 0
  const totalSteps = run.step_results?.length || run.test_steps?.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/runs"
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{run.test_name}</h1>
            <div className="flex items-center space-x-4 mt-1">
              <span
                className={`badge ${
                  run.status === 'passed'
                    ? 'badge-success'
                    : run.status === 'failed'
                    ? 'badge-danger'
                    : run.status === 'running'
                    ? 'badge-info'
                    : 'badge-warning'
                }`}
              >
                {run.status}
              </span>
              <span className="text-gray-500">
                {run.duration_ms
                  ? `${(run.duration_ms / 1000).toFixed(2)}s`
                  : '-'}
              </span>
              <span className="text-gray-500">
                {passedSteps}/{totalSteps} steps passed
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleRerun}
          disabled={run.status === 'running'}
          className="btn btn-primary flex items-center disabled:opacity-50"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Rerun Test
        </button>
      </div>

      {/* Error Message */}
      {run.error_message && (
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-start space-x-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-red-600 mt-1">{run.error_message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Run Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step Results */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div
                        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                        onClick={() => toggleStep(index)}
                      >
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(step.status)}
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-medium text-gray-600">
                            {index + 1}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 capitalize">
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
                              className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
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
                        <div className="p-4 border-t border-gray-200 space-y-3">
                          {testStep?.selector && (
                            <div>
                              <span className="text-sm text-gray-500">Selector:</span>
                              <code className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">
                                {testStep.selector}
                              </code>
                            </div>
                          )}
                          {testStep?.value && (
                            <div>
                              <span className="text-sm text-gray-500">Value:</span>
                              <span className="ml-2 text-sm">{testStep.value}</span>
                            </div>
                          )}
                          {step.error_message && (
                            <div className="p-3 bg-red-50 rounded-lg">
                              <span className="text-sm text-red-600">
                                {step.error_message}
                              </span>
                            </div>
                          )}
                          {step.visual_diff_percent !== null && (
                            <div className="p-3 bg-yellow-50 rounded-lg">
                              <span className="text-sm text-yellow-700">
                                Visual difference: {(step.visual_diff_percent * 100).toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {step.screenshot_path && (
                            <div>
                              <img
                                src={`/screenshots/${step.screenshot_path.split('/').pop()}`}
                                alt={`Step ${index + 1}`}
                                className="max-w-full rounded-lg border border-gray-200 cursor-pointer"
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
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Test</dt>
                <dd className="mt-1">
                  <Link
                    to={`/tests/${run.test_id}`}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {run.test_name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`badge ${
                      run.status === 'passed'
                        ? 'badge-success'
                        : run.status === 'failed'
                        ? 'badge-danger'
                        : 'badge-warning'
                    }`}
                  >
                    {run.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Duration</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {run.duration_ms
                    ? `${(run.duration_ms / 1000).toFixed(2)} seconds`
                    : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Started</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {run.started_at
                    ? new Date(run.started_at).toLocaleString()
                    : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Completed</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {run.completed_at
                    ? new Date(run.completed_at).toLocaleString()
                    : '-'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Screenshots */}
          {run.screenshots?.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Screenshots ({run.screenshots.length})
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {run.screenshots.map((screenshot, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedScreenshot(screenshot.path)}
                    className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-500"
                  >
                    <img
                      src={`/screenshots/${screenshot.path.split('/').pop()}`}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-1 px-2">
                      Step {screenshot.step_index + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
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
