import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  Play,
  Edit,
  Trash2,
  FolderKanban,
  MoreVertical
} from 'lucide-react'
import { suites } from '../lib/api'

export default function Suites() {
  const navigate = useNavigate()
  const [suiteList, setSuiteList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSuite, setEditingSuite] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [openMenu, setOpenMenu] = useState(null)

  useEffect(() => {
    fetchSuites()
  }, [])

  async function fetchSuites() {
    try {
      const data = await suites.list()
      setSuiteList(data)
    } catch (error) {
      console.error('Failed to fetch suites:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editingSuite) {
        const updated = await suites.update(editingSuite.id, formData)
        setSuiteList(suiteList.map(s => s.id === editingSuite.id ? { ...s, ...updated } : s))
      } else {
        const newSuite = await suites.create(formData)
        setSuiteList([newSuite, ...suiteList])
      }
      closeModal()
    } catch (error) {
      alert('Failed to save suite: ' + error.message)
    }
  }

  async function handleDeleteSuite(id) {
    if (!confirm('Are you sure you want to delete this suite?')) return
    try {
      await suites.delete(id)
      setSuiteList(suiteList.filter(s => s.id !== id))
    } catch (error) {
      alert('Failed to delete suite: ' + error.message)
    }
  }

  async function handleRunSuite(id) {
    try {
      await suites.run(id)
      navigate('/runs')
    } catch (error) {
      alert('Failed to run suite: ' + error.message)
    }
  }

  function openCreateModal() {
    setEditingSuite(null)
    setFormData({ name: '', description: '' })
    setShowModal(true)
  }

  function openEditModal(suite) {
    setEditingSuite(suite)
    setFormData({ name: suite.name, description: suite.description || '' })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingSuite(null)
    setFormData({ name: '', description: '' })
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
        <h2 className="text-lg font-semibold text-gray-900">
          {suiteList.length} Test Suite{suiteList.length !== 1 ? 's' : ''}
        </h2>
        <button onClick={openCreateModal} className="btn btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          New Suite
        </button>
      </div>

      {/* Suites Grid */}
      {suiteList.length === 0 ? (
        <div className="card text-center py-12">
          <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No test suites yet</p>
          <button onClick={openCreateModal} className="btn btn-primary">
            Create your first suite
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suiteList.map((suite) => (
            <div key={suite.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <Link
                      to={`/suites/${suite.id}`}
                      className="font-semibold text-gray-900 hover:text-primary-600"
                    >
                      {suite.name}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {suite.test_count || 0} tests
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === suite.id ? null : suite.id)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {openMenu === suite.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <button
                        onClick={() => {
                          openEditModal(suite)
                          setOpenMenu(null)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteSuite(suite.id)
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

              {suite.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {suite.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  Created {new Date(suite.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleRunSuite(suite.id)}
                  disabled={!suite.test_count}
                  className="btn btn-success btn-sm flex items-center disabled:opacity-50"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Run All
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSuite ? 'Edit Suite' : 'Create New Suite'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Smoke Tests"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this suite..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSuite ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
