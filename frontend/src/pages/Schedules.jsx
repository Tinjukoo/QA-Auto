import { useState, useEffect } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Play,
  Clock,
  MoreVertical
} from 'lucide-react'
import { schedules, tests, suites } from '../lib/api'

const commonCronExpressions = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every day at 9am', value: '0 9 * * *' },
  { label: 'Every Monday at 9am', value: '0 9 * * 1' },
  { label: 'Every weekday at 9am', value: '0 9 * * 1-5' },
]

export default function Schedules() {
  const [scheduleList, setScheduleList] = useState([])
  const [testList, setTestList] = useState([])
  const [suiteList, setSuiteList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [formData, setFormData] = useState({
    test_id: '',
    suite_id: '',
    cron_expression: '0 9 * * *',
    timezone: 'UTC',
    active: true
  })
  const [openMenu, setOpenMenu] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [scheduleData, testData, suiteData] = await Promise.all([
        schedules.list(),
        tests.list(),
        suites.list()
      ])
      setScheduleList(scheduleData)
      setTestList(testData)
      setSuiteList(suiteData)
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const data = {
        cron_expression: formData.cron_expression,
        timezone: formData.timezone,
        active: formData.active
      }
      if (formData.test_id) data.test_id = formData.test_id
      if (formData.suite_id) data.suite_id = formData.suite_id

      if (editingSchedule) {
        const updated = await schedules.update(editingSchedule.id, data)
        setScheduleList(scheduleList.map(s => s.id === editingSchedule.id ? updated : s))
      } else {
        const newSchedule = await schedules.create(data)
        setScheduleList([newSchedule, ...scheduleList])
      }
      closeModal()
    } catch (error) {
      alert('Failed to save schedule: ' + error.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this schedule?')) return
    try {
      await schedules.delete(id)
      setScheduleList(scheduleList.filter(s => s.id !== id))
    } catch (error) {
      alert('Failed to delete schedule: ' + error.message)
    }
  }

  async function handleTrigger(id) {
    try {
      await schedules.trigger(id)
      alert('Schedule triggered successfully!')
      fetchData()
    } catch (error) {
      alert('Failed to trigger schedule: ' + error.message)
    }
  }

  async function handleToggleActive(schedule) {
    try {
      const updated = await schedules.update(schedule.id, { active: !schedule.active })
      setScheduleList(scheduleList.map(s => s.id === schedule.id ? updated : s))
    } catch (error) {
      alert('Failed to update schedule: ' + error.message)
    }
  }

  function openCreateModal() {
    setEditingSchedule(null)
    setFormData({
      test_id: '',
      suite_id: '',
      cron_expression: '0 9 * * *',
      timezone: 'UTC',
      active: true
    })
    setShowModal(true)
  }

  function openEditModal(schedule) {
    setEditingSchedule(schedule)
    setFormData({
      test_id: schedule.test_id || '',
      suite_id: schedule.suite_id || '',
      cron_expression: schedule.cron_expression,
      timezone: schedule.timezone,
      active: schedule.active
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingSchedule(null)
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
            Schedule tests to run automatically at specific times.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Add Schedule
        </button>
      </div>

      {/* Schedules List */}
      {scheduleList.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No schedules configured</p>
          <button onClick={openCreateModal} className="btn btn-primary">
            Create your first schedule
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Run
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Run
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {scheduleList.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {schedule.test_name ? (
                        <>
                          <span className="badge badge-info">Test</span>
                          <span className="font-medium text-gray-900">{schedule.test_name}</span>
                        </>
                      ) : (
                        <>
                          <span className="badge badge-gray">Suite</span>
                          <span className="font-medium text-gray-900">{schedule.suite_name}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {schedule.cron_expression}
                    </code>
                    <span className="ml-2 text-sm text-gray-500">
                      ({schedule.timezone})
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${
                      schedule.active ? 'badge-success' : 'badge-gray'
                    }`}>
                      {schedule.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {schedule.last_run_at
                      ? new Date(schedule.last_run_at).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {schedule.next_run_at
                      ? new Date(schedule.next_run_at).toLocaleString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleTrigger(schedule.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Run Now"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === schedule.id ? null : schedule.id)}
                          className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {openMenu === schedule.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() => {
                                handleToggleActive(schedule)
                                setOpenMenu(null)
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              {schedule.active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => {
                                openEditModal(schedule)
                                setOpenMenu(null)
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(schedule.id)
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingSchedule && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Test
                    </label>
                    <select
                      className="input"
                      value={formData.test_id}
                      onChange={(e) => setFormData({
                        ...formData,
                        test_id: e.target.value,
                        suite_id: e.target.value ? '' : formData.suite_id
                      })}
                    >
                      <option value="">Select a test...</option>
                      {testList.map((test) => (
                        <option key={test.id} value={test.id}>{test.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-center text-gray-500 text-sm">or</div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Suite
                    </label>
                    <select
                      className="input"
                      value={formData.suite_id}
                      onChange={(e) => setFormData({
                        ...formData,
                        suite_id: e.target.value,
                        test_id: e.target.value ? '' : formData.test_id
                      })}
                    >
                      <option value="">Select a suite...</option>
                      {suiteList.map((suite) => (
                        <option key={suite.id} value={suite.id}>{suite.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cron Expression *
                </label>
                <input
                  type="text"
                  className="input font-mono"
                  value={formData.cron_expression}
                  onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
                  placeholder="0 9 * * *"
                  required
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {commonCronExpressions.map((expr) => (
                    <button
                      key={expr.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, cron_expression: expr.value })}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      {expr.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  className="input"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="schedule-active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="schedule-active" className="text-sm text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editingSchedule && !formData.test_id && !formData.suite_id}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {editingSchedule ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
