import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  Play,
  Edit,
  Trash2,
  Copy,
  MoreVertical,
  Search,
  Filter
} from 'lucide-react'
import { tests, runs } from '../lib/api'

export default function Tests() {
  const navigate = useNavigate()
  const [testList, setTestList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [openMenu, setOpenMenu] = useState(null)

  useEffect(() => {
    fetchTests()
  }, [statusFilter])

  async function fetchTests() {
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const data = await tests.list(params)
      setTestList(data)
    } catch (error) {
      console.error('Failed to fetch tests:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRunTest(testId) {
    try {
      await runs.create({ test_id: testId })
      navigate('/runs')
    } catch (error) {
      alert('Failed to run test: ' + error.message)
    }
  }

  async function handleDeleteTest(testId) {
    if (!confirm('Are you sure you want to delete this test?')) return

    try {
      await tests.delete(testId)
      setTestList(testList.filter(t => t.id !== testId))
    } catch (error) {
      alert('Failed to delete test: ' + error.message)
    }
  }

  async function handleDuplicateTest(testId) {
    try {
      const newTest = await tests.duplicate(testId)
      setTestList([newTest, ...testList])
    } catch (error) {
      alert('Failed to duplicate test: ' + error.message)
    }
  }

  const filteredTests = testList.filter(test =>
    test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (test.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">Active</span>
      case 'draft':
        return <span className="badge badge-gray">Draft</span>
      case 'disabled':
        return <span className="badge badge-warning">Disabled</span>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tests..."
              className="input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="input w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <Link to="/tests/new" className="btn btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          New Test
        </Link>
      </div>

      {/* Tests List */}
      {filteredTests.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No tests found</p>
          <Link to="/tests/new" className="btn btn-primary">
            Create your first test
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Steps
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      to={`/tests/${test.id}`}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {test.name}
                    </Link>
                    {test.description && (
                      <p className="text-sm text-gray-500 truncate max-w-md">
                        {test.description}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(test.status)}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {test.steps?.length || 0} steps
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {new Date(test.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleRunTest(test.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Run Test"
                      >
                        <Play className="w-5 h-5" />
                      </button>
                      <Link
                        to={`/tests/${test.id}/edit`}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </Link>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === test.id ? null : test.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {openMenu === test.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() => {
                                handleDuplicateTest(test.id)
                                setOpenMenu(null)
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteTest(test.id)
                                setOpenMenu(null)
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
