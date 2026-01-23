import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  Plus,
  TestTube2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { suites, tests, runs } from '../lib/api'

export default function SuiteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [suite, setSuite] = useState(null)
  const [allTests, setAllTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [suiteData, testsData] = await Promise.all([
          suites.get(id),
          tests.list(),
        ])
        setSuite(suiteData)
        setAllTests(testsData)
      } catch (error) {
        console.error('Failed to fetch suite:', error)
        navigate('/suites')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  async function handleRunSuite() {
    try {
      await suites.run(id)
      navigate('/runs')
    } catch (error) {
      alert('Failed to run suite: ' + error.message)
    }
  }

  async function handleAddTest(testId) {
    try {
      await tests.update(testId, { suite_id: id })
      const updatedSuite = await suites.get(id)
      setSuite(updatedSuite)
      setShowAddModal(false)
    } catch (error) {
      alert('Failed to add test: ' + error.message)
    }
  }

  async function handleRemoveTest(testId) {
    try {
      await tests.update(testId, { suite_id: null })
      setSuite({
        ...suite,
        tests: suite.tests.filter(t => t.id !== testId)
      })
    } catch (error) {
      alert('Failed to remove test: ' + error.message)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!suite) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Suite not found</p>
        <Link to="/suites" className="btn btn-primary mt-4">
          Back to Suites
        </Link>
      </div>
    )
  }

  const availableTests = allTests.filter(
    t => !suite.tests?.some(st => st.id === t.id)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/suites"
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{suite.name}</h1>
            {suite.description && (
              <p className="text-gray-500 mt-1">{suite.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-secondary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Test
          </button>
          <button
            onClick={handleRunSuite}
            disabled={!suite.tests?.length}
            className="btn btn-success flex items-center disabled:opacity-50"
          >
            <Play className="w-5 h-5 mr-2" />
            Run All Tests
          </button>
        </div>
      </div>

      {/* Tests in Suite */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Tests in Suite ({suite.tests?.length || 0})
        </h2>

        {!suite.tests?.length ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <TestTube2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No tests in this suite</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              Add Tests
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {suite.tests.map((test) => (
              <div
                key={test.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <TestTube2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <Link
                      to={`/tests/${test.id}`}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {test.name}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {test.steps?.length || 0} steps
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
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
                  <button
                    onClick={() => handleRunTest(test.id)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    title="Run Test"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveTest(test.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Remove from Suite"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Test Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Tests to Suite
            </h3>

            {availableTests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No available tests to add</p>
                <Link to="/tests/new" className="btn btn-primary">
                  Create New Test
                </Link>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                {availableTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{test.name}</p>
                      <p className="text-sm text-gray-500">
                        {test.steps?.length || 0} steps
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddTest(test.id)}
                      className="btn btn-primary btn-sm"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
