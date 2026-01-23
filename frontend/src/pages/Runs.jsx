import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Filter
} from 'lucide-react'
import { runs } from '../lib/api'

export default function Runs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [runList, setRunList] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')

  useEffect(() => {
    fetchRuns()
    // Refresh every 10 seconds for running tests
    const interval = setInterval(fetchRuns, 10000)
    return () => clearInterval(interval)
  }, [statusFilter])

  async function fetchRuns() {
    try {
      const params = { limit: 20 }
      if (statusFilter) params.status = statusFilter

      const data = await runs.list(params)
      setRunList(data.runs)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch runs:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRerun(runId) {
    try {
      await runs.rerun(runId)
      fetchRuns()
    } catch (error) {
      alert('Failed to rerun test: ' + error.message)
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'passed':
        return <span className="badge badge-success">Passed</span>
      case 'failed':
        return <span className="badge badge-danger">Failed</span>
      case 'running':
        return <span className="badge badge-info">Running</span>
      case 'pending':
        return <span className="badge badge-warning">Pending</span>
      case 'cancelled':
        return <span className="badge badge-gray">Cancelled</span>
      case 'error':
        return <span className="badge badge-danger">Error</span>
      default:
        return <span className="badge badge-gray">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            className="input w-40"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              if (e.target.value) {
                setSearchParams({ status: e.target.value })
              } else {
                setSearchParams({})
              }
            }}
          >
            <option value="">All Status</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
            <option value="error">Error</option>
          </select>
        </div>
        <button
          onClick={fetchRuns}
          className="btn btn-secondary flex items-center"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Refresh
        </button>
      </div>

      {/* Runs List */}
      {runList.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No test runs found</p>
          <Link to="/tests" className="btn btn-primary">
            Go to Tests
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {runList.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(run.status)}
                      {getStatusBadge(run.status)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/runs/${run.id}`}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {run.test_name}
                    </Link>
                    {run.error_message && (
                      <p className="text-sm text-red-500 truncate max-w-md">
                        {run.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {run.duration_ms
                      ? `${(run.duration_ms / 1000).toFixed(2)}s`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {run.started_at
                      ? new Date(run.started_at).toLocaleString()
                      : new Date(run.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        to={`/runs/${run.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        View Details
                      </Link>
                      {(run.status === 'failed' || run.status === 'error' || run.status === 'passed') && (
                        <button
                          onClick={() => handleRerun(run.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Rerun"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
        </div>
      )}
    </div>
  )
}
