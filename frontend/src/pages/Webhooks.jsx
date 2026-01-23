import { useState, useEffect } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  Webhook,
  Send,
  CheckCircle,
  XCircle,
  MoreVertical
} from 'lucide-react'
import { webhooks } from '../lib/api'

export default function Webhooks() {
  const [webhookList, setWebhookList] = useState([])
  const [availableEvents, setAvailableEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [],
    active: true
  })
  const [testingId, setTestingId] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [openMenu, setOpenMenu] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [hookData, eventsData] = await Promise.all([
        webhooks.list(),
        webhooks.events()
      ])
      setWebhookList(hookData)
      setAvailableEvents(eventsData)
    } catch (error) {
      console.error('Failed to fetch webhooks:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editingWebhook) {
        const updated = await webhooks.update(editingWebhook.id, formData)
        setWebhookList(webhookList.map(w => w.id === editingWebhook.id ? updated : w))
      } else {
        const newWebhook = await webhooks.create(formData)
        setWebhookList([newWebhook, ...webhookList])
      }
      closeModal()
    } catch (error) {
      alert('Failed to save webhook: ' + error.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this webhook?')) return
    try {
      await webhooks.delete(id)
      setWebhookList(webhookList.filter(w => w.id !== id))
    } catch (error) {
      alert('Failed to delete webhook: ' + error.message)
    }
  }

  async function handleTest(id) {
    setTestingId(id)
    setTestResult(null)
    try {
      const result = await webhooks.test(id)
      setTestResult({ id, ...result })
    } catch (error) {
      setTestResult({ id, success: false, error: error.message })
    } finally {
      setTestingId(null)
    }
  }

  async function handleToggleActive(webhook) {
    try {
      const updated = await webhooks.update(webhook.id, { active: !webhook.active })
      setWebhookList(webhookList.map(w => w.id === webhook.id ? updated : w))
    } catch (error) {
      alert('Failed to update webhook: ' + error.message)
    }
  }

  function openCreateModal() {
    setEditingWebhook(null)
    setFormData({ name: '', url: '', events: [], active: true })
    setShowModal(true)
  }

  function openEditModal(webhook) {
    setEditingWebhook(webhook)
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      active: webhook.active
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingWebhook(null)
    setFormData({ name: '', url: '', events: [], active: true })
  }

  function toggleEvent(event) {
    if (formData.events.includes(event)) {
      setFormData({ ...formData, events: formData.events.filter(e => e !== event) })
    } else {
      setFormData({ ...formData, events: [...formData.events, event] })
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
        <div>
          <p className="text-gray-500">
            Configure webhooks to receive notifications when tests complete.
            Integrate with n8n, Zapier, or any webhook-compatible service.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Add Webhook
        </button>
      </div>

      {/* Webhooks List */}
      {webhookList.length === 0 ? (
        <div className="card text-center py-12">
          <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No webhooks configured</p>
          <button onClick={openCreateModal} className="btn btn-primary">
            Add your first webhook
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhookList.map((webhook) => (
            <div key={webhook.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    webhook.active ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Webhook className={`w-5 h-5 ${
                      webhook.active ? 'text-green-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">{webhook.name}</h3>
                      <span className={`badge ${
                        webhook.active ? 'badge-success' : 'badge-gray'
                      }`}>
                        {webhook.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 font-mono mt-1 break-all">
                      {webhook.url}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {webhook.events.map((event) => (
                        <span key={event} className="badge badge-info">
                          {event}
                        </span>
                      ))}
                    </div>

                    {/* Test Result */}
                    {testResult && testResult.id === webhook.id && (
                      <div className={`mt-3 p-3 rounded-lg ${
                        testResult.success ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <div className="flex items-center space-x-2">
                          {testResult.success ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                            {testResult.success
                              ? `Success (${testResult.status})`
                              : `Failed: ${testResult.error}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTest(webhook.id)}
                    disabled={testingId === webhook.id}
                    className="btn btn-secondary btn-sm flex items-center"
                  >
                    {testingId === webhook.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Test
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === webhook.id ? null : webhook.id)}
                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {openMenu === webhook.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <button
                          onClick={() => {
                            handleToggleActive(webhook)
                            setOpenMenu(null)
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {webhook.active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => {
                            openEditModal(webhook)
                            setOpenMenu(null)
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            handleDelete(webhook.id)
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingWebhook ? 'Edit Webhook' : 'Add Webhook'}
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
                  placeholder="e.g., n8n Production"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL *
                </label>
                <input
                  type="url"
                  className="input"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://your-webhook-url.com/endpoint"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Events *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableEvents.map((event) => (
                    <label
                      key={event}
                      className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.events.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="text-sm text-gray-700">
                  Active
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formData.events.length === 0}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {editingWebhook ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
