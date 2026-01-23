import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  TestTube2,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowRight
} from 'lucide-react'
import { runs, tests, suites } from '../lib/api'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentRuns, setRecentRuns] = useState([])
  const [testCount, setTestCount] = useState(0)
  const [suiteCount, setSuiteCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, runsData, testsData, suitesData] = await Promise.all([
          runs.stats({ days: 7 }),
          runs.list({ limit: 5 }),
          tests.list(),
          suites.list(),
        ])

        setStats(statsData.summary)
        setRecentRuns(runsData.runs)
        setTestCount(testsData.length)
        setSuiteCount(suitesData.length)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const statCards = [
    {
      name: 'Total Tests',
      value: testCount,
      icon: TestTube2,
      color: 'bg-blue-500',
      href: '/tests'
    },
    {
      name: 'Test Suites',
      value: suiteCount,
      icon: Play,
      color: 'bg-purple-500',
      href: '/suites'
    },
    {
      name: 'Passed (7d)',
      value: stats?.passed || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      href: '/runs?status=passed'
    },
    {
      name: 'Failed (7d)',
      value: stats?.failed || 0,
      icon: XCircle,
      color: 'bg-red-500',
      href: '/runs?status=failed'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="card hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Last 7 Days Overview
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">Total Runs</span>
              </div>
              <span className="font-semibold">{stats?.total_runs || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-600">Pass Rate</span>
              </div>
              <span className="font-semibold text-green-600">
                {stats?.total_runs > 0
                  ? Math.round((stats.passed / stats.total_runs) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">Avg Duration</span>
              </div>
              <span className="font-semibold">
                {stats?.avg_duration
                  ? `${Math.round(stats.avg_duration / 1000)}s`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <span className="text-gray-600">Errors</span>
              </div>
              <span className="font-semibold text-yellow-600">
                {stats?.errors || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Runs</h3>
            <Link
              to="/runs"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              View all
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentRuns.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent runs</p>
            ) : (
              recentRuns.map((run) => (
                <Link
                  key={run.id}
                  to={`/runs/${run.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {run.status === 'passed' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {run.status === 'failed' && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    {run.status === 'running' && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                    )}
                    {(run.status === 'pending' || run.status === 'error') && (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                    <span className="font-medium text-gray-900 truncate max-w-[200px]">
                      {run.test_name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(run.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Link to="/tests/new" className="btn btn-primary">
            Create New Test
          </Link>
          <Link to="/recorder" className="btn btn-secondary">
            Open Recorder
          </Link>
          <Link to="/suites" className="btn btn-secondary">
            Manage Suites
          </Link>
          <Link to="/webhooks" className="btn btn-secondary">
            Configure Webhooks
          </Link>
        </div>
      </div>
    </div>
  )
}
