import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Play,
  Edit,
  Trash2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  MousePointer,
  Type,
  Navigation,
  Eye,
  Image
} from 'lucide-react'
import { tests, runs } from '../lib/api'

const stepIcons = {
  navigate: Navigation,
  click: MousePointer,
  type: Type,
  wait: Clock,
  assert: CheckCircle,
  screenshot: Image,
  hover: MousePointer,
  scroll: MousePointer,
  select: MousePointer,
  keyboard: Type,
}

export default function TestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [test, setTest] = useState(null)
  const [testRuns, setTestRuns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [testData, runsData] = await Promise.all([
          tests.get(id),
          tests.runs(id, { limit: 10 }),
        ])
        setTest(testData)
        setTestRuns(runsData)
      } catch (error) {
        console.error('Failed to fetch test:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  async function handleRunTest() {
    try {
      await runs.create({ test_id: id })
      navigate('/runs')
    } catch (error) {
      alert('Failed to run test: ' + error.message)
    }
  }

  async function handleDeleteTest() {
    if (!confirm('Are you sure you want to delete this test?')) return

    try {
      await tests.delete(id)
      navigate('/tests')
    } catch (error) {
      alert('Failed to delete test: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!test) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Test not found</p>
        <Link to="/tests" className="btn btn-primary mt-4">
          Back to Tests
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/tests"
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{test.name}</h1>
            {test.description && (
              <p className="text-gray-500 mt-1">{test.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunTest}
            className="btn btn-success flex items-center"
          >
            <Play className="w-5 h-5 mr-2" />
            Run Test
          </button>
          <Link
            to={`/tests/${id}/edit`}
            className="btn btn-secondary flex items-center"
          >
            <Edit className="w-5 h-5 mr-2" />
            Edit
          </Link>
          <button
            onClick={handleDeleteTest}
            className="btn btn-danger flex items-center"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Test Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Steps */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Test Steps ({test.steps?.length || 0})
            </h2>
            {test.steps?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No steps defined. Edit the test to add steps.
              </p>
            ) : (
              <div className="space-y-3">
                {test.steps?.map((step, index) => {
                  const Icon = stepIcons[step.type] || Eye
                  return (
                    <div
                      key={index}
                      className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900 capitalize">
                            {step.type}
                          </span>
                        </div>
                        {step.selector && (
                          <p className="text-sm text-gray-500 mt-1 font-mono truncate">
                            {step.selector}
                          </p>
                        )}
                        {step.value && (
                          <p className="text-sm text-gray-600 mt-1">
                            Value: {step.value}
                          </p>
                        )}
                        {step.url && (
                          <p className="text-sm text-blue-600 mt-1 truncate">
                            {step.url}
                          </p>
                        )}
                        {step.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Test Details */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`badge ${
                      test.status === 'active'
                        ? 'badge-success'
                        : test.status === 'draft'
                        ? 'badge-gray'
                        : 'badge-warning'
                    }`}
                  >
                    {test.status}
                  </span>
                </dd>
              </div>
              {test.base_url && (
                <div>
                  <dt className="text-sm text-gray-500">Base URL</dt>
                  <dd className="mt-1 text-sm text-gray-900 break-all">
                    {test.base_url}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(test.created_at).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(test.updated_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Recent Runs */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Runs
            </h2>
            {testRuns.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No runs yet</p>
            ) : (
              <div className="space-y-2">
                {testRuns.map((run) => (
                  <Link
                    key={run.id}
                    to={`/runs/${run.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      {run.status === 'passed' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {run.status === 'failed' && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      {run.status === 'running' && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                      )}
                      <span className="text-sm text-gray-600">
                        {run.duration_ms
                          ? `${(run.duration_ms / 1000).toFixed(1)}s`
                          : '-'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(run.created_at).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
