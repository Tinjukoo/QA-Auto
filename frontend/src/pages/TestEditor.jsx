import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Play,
  MousePointer,
  Type,
  Navigation,
  Clock,
  CheckCircle,
  Image,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { tests, runs } from '../lib/api'

const stepTypes = [
  { type: 'navigate', label: 'Navigate', icon: Navigation },
  { type: 'click', label: 'Click', icon: MousePointer },
  { type: 'type', label: 'Type', icon: Type },
  { type: 'wait', label: 'Wait', icon: Clock },
  { type: 'assert', label: 'Assert', icon: CheckCircle },
  { type: 'screenshot', label: 'Screenshot', icon: Image },
  { type: 'hover', label: 'Hover', icon: MousePointer },
  { type: 'scroll', label: 'Scroll', icon: MousePointer },
  { type: 'select', label: 'Select', icon: MousePointer },
  { type: 'keyboard', label: 'Keyboard', icon: Type },
]

const defaultStep = {
  type: 'click',
  selector: '',
  value: '',
  description: '',
  timeout: 30000,
  takeScreenshot: true,
}

export default function TestEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_url: '',
    status: 'draft',
    steps: [],
  })
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [expandedSteps, setExpandedSteps] = useState(new Set())

  useEffect(() => {
    if (isEditing) {
      fetchTest()
    }
  }, [id])

  async function fetchTest() {
    try {
      const test = await tests.get(id)
      setFormData({
        name: test.name,
        description: test.description || '',
        base_url: test.base_url || '',
        status: test.status,
        steps: test.steps || [],
      })
    } catch (error) {
      console.error('Failed to fetch test:', error)
      navigate('/tests')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    try {
      if (isEditing) {
        await tests.update(id, formData)
      } else {
        const newTest = await tests.create(formData)
        navigate(`/tests/${newTest.id}`)
        return
      }
      navigate(`/tests/${id}`)
    } catch (error) {
      alert('Failed to save test: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  function addStep(type = 'click') {
    const newStep = { ...defaultStep, type }
    setFormData({
      ...formData,
      steps: [...formData.steps, newStep],
    })
    setExpandedSteps(new Set([...expandedSteps, formData.steps.length]))
  }

  function updateStep(index, updates) {
    const newSteps = [...formData.steps]
    newSteps[index] = { ...newSteps[index], ...updates }
    setFormData({ ...formData, steps: newSteps })
  }

  function removeStep(index) {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    })
  }

  function moveStep(index, direction) {
    const newSteps = [...formData.steps]
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= newSteps.length) return

    const temp = newSteps[index]
    newSteps[index] = newSteps[targetIndex]
    newSteps[targetIndex] = temp
    setFormData({ ...formData, steps: newSteps })
  }

  function toggleStepExpanded(index) {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSteps(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to={isEditing ? `/tests/${id}` : '/tests'}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Test' : 'Create Test'}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <Link to={isEditing ? `/tests/${id}` : '/tests'} className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex items-center"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Saving...' : 'Save Test'}
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Name *
              </label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Login Flow Test"
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
                placeholder="Describe what this test does..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base URL
                </label>
                <input
                  type="url"
                  className="input"
                  value={formData.base_url}
                  onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Test Steps ({formData.steps.length})
            </h2>
            <div className="flex items-center space-x-2">
              <select
                className="input w-40"
                onChange={(e) => {
                  if (e.target.value) {
                    addStep(e.target.value)
                    e.target.value = ''
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Add Step...</option>
                {stepTypes.map((st) => (
                  <option key={st.type} value={st.type}>{st.label}</option>
                ))}
              </select>
            </div>
          </div>

          {formData.steps.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500 mb-4">No steps defined yet</p>
              <button
                type="button"
                onClick={() => addStep('navigate')}
                className="btn btn-primary"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add First Step
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.steps.map((step, index) => {
                const StepIcon = stepTypes.find(s => s.type === step.type)?.icon || MousePointer
                const isExpanded = expandedSteps.has(index)

                return (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {/* Step Header */}
                    <div
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                      onClick={() => toggleStepExpanded(index)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1 text-gray-400">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveStep(index, -1) }}
                            disabled={index === 0}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveStep(index, 1) }}
                            disabled={index === formData.steps.length - 1}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-medium">
                          {index + 1}
                        </div>
                        <StepIcon className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-900 capitalize">{step.type}</span>
                        {step.selector && (
                          <span className="text-sm text-gray-500 font-mono truncate max-w-xs">
                            {step.selector}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeStep(index) }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Step Details */}
                    {isExpanded && (
                      <div className="p-4 space-y-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Step Type
                            </label>
                            <select
                              className="input"
                              value={step.type}
                              onChange={(e) => updateStep(index, { type: e.target.value })}
                            >
                              {stepTypes.map((st) => (
                                <option key={st.type} value={st.type}>{st.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Timeout (ms)
                            </label>
                            <input
                              type="number"
                              className="input"
                              value={step.timeout || 30000}
                              onChange={(e) => updateStep(index, { timeout: parseInt(e.target.value) })}
                            />
                          </div>
                        </div>

                        {/* Type-specific fields */}
                        {step.type === 'navigate' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              URL
                            </label>
                            <input
                              type="text"
                              className="input"
                              value={step.url || ''}
                              onChange={(e) => updateStep(index, { url: e.target.value })}
                              placeholder="https://example.com/page"
                            />
                          </div>
                        )}

                        {['click', 'type', 'hover', 'scroll', 'select', 'assert', 'wait'].includes(step.type) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Selector
                            </label>
                            <input
                              type="text"
                              className="input font-mono"
                              value={step.selector || ''}
                              onChange={(e) => updateStep(index, { selector: e.target.value })}
                              placeholder="button.submit, #login-form, [data-testid='submit']"
                            />
                          </div>
                        )}

                        {['type', 'select'].includes(step.type) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Value
                            </label>
                            <input
                              type="text"
                              className="input"
                              value={step.value || ''}
                              onChange={(e) => updateStep(index, { value: e.target.value })}
                              placeholder="Text to type or option to select"
                            />
                          </div>
                        )}

                        {step.type === 'keyboard' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Key
                            </label>
                            <input
                              type="text"
                              className="input"
                              value={step.key || ''}
                              onChange={(e) => updateStep(index, { key: e.target.value })}
                              placeholder="Enter, Tab, Escape, etc."
                            />
                          </div>
                        )}

                        {step.type === 'wait' && !step.selector && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Duration (ms)
                            </label>
                            <input
                              type="number"
                              className="input"
                              value={step.duration || 1000}
                              onChange={(e) => updateStep(index, { duration: parseInt(e.target.value) })}
                            />
                          </div>
                        )}

                        {step.type === 'assert' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Assert Type
                              </label>
                              <select
                                className="input"
                                value={step.assertType || 'visible'}
                                onChange={(e) => updateStep(index, { assertType: e.target.value })}
                              >
                                <option value="visible">Is Visible</option>
                                <option value="text">Contains Text</option>
                                <option value="attribute">Has Attribute</option>
                              </select>
                            </div>
                            {(step.assertType === 'text' || step.assertType === 'attribute') && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Expected Value
                                </label>
                                <input
                                  type="text"
                                  className="input"
                                  value={step.expectedValue || ''}
                                  onChange={(e) => updateStep(index, { expectedValue: e.target.value })}
                                />
                              </div>
                            )}
                          </>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            className="input"
                            value={step.description || ''}
                            onChange={(e) => updateStep(index, { description: e.target.value })}
                            placeholder="Describe this step..."
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`screenshot-${index}`}
                            checked={step.takeScreenshot !== false}
                            onChange={(e) => updateStep(index, { takeScreenshot: e.target.checked })}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`screenshot-${index}`} className="text-sm text-gray-700">
                            Take screenshot after this step
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
