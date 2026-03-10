import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Plus, Edit, Trash2, Clock, Building2 } from 'lucide-react'
import { adminAPI, organizationsAPI } from '../../services/api'
import toast from 'react-hot-toast'

export const SLAPolicies = () => {
  const [policies, setPolicies] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [selectedOrganization, setSelectedOrganization] = useState('')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    priority: '',
    responseTimeHours: '',
    responseTimeMinutes: '',
    resolutionTimeHours: '',
    resolutionTimeMinutes: '',
    description: '',
    isActive: true,
  })

  useEffect(() => {
    loadOrganizations()
  }, [])

  useEffect(() => {
    loadPolicies()
  }, [selectedOrganization])

  const loadOrganizations = async () => {
    try {
      const data = await organizationsAPI.getAll()
      setOrganizations(data)
    } catch (error) {
      console.error('Failed to load organizations', error)
    }
  }

  const loadPolicies = async () => {
    try {
      setLoading(true)
      const data = await adminAPI.getSLAPolicies(selectedOrganization || null)
      setPolicies(data)
    } catch (error) {
      toast.error('Failed to load SLA policies')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Convert hours (decimal) to hours and minutes
  const hoursToHoursMinutes = (totalHours) => {
    if (!totalHours && totalHours !== 0) return { hours: '', minutes: '' }
    const hours = Math.floor(totalHours)
    const minutes = Math.round((totalHours - hours) * 60)
    return { hours: hours.toString(), minutes: minutes.toString() }
  }

  // Convert hours and minutes to total hours (decimal)
  const hoursMinutesToHours = (hours, minutes) => {
    const h = parseFloat(hours) || 0
    const m = parseFloat(minutes) || 0
    return h + (m / 60)
  }

  const handleOpenModal = (policy = null) => {
    if (policy) {
      setEditingPolicy(policy)
      const responseTime = hoursToHoursMinutes(policy.responseTime)
      const resolutionTime = hoursToHoursMinutes(policy.resolutionTime)
      setFormData({
        name: policy.name || '',
        organization: policy.organization?._id || policy.organization || '',
        priority: policy.priority || '',
        responseTimeHours: responseTime.hours,
        responseTimeMinutes: responseTime.minutes,
        resolutionTimeHours: resolutionTime.hours,
        resolutionTimeMinutes: resolutionTime.minutes,
        description: policy.description || '',
        isActive: policy.isActive !== undefined ? policy.isActive : true,
      })
    } else {
      setEditingPolicy(null)
      setFormData({
        name: '',
        organization: selectedOrganization || '',
        priority: '',
        responseTimeHours: '',
        responseTimeMinutes: '0',
        resolutionTimeHours: '',
        resolutionTimeMinutes: '0',
        description: '',
        isActive: true,
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingPolicy(null)
    setFormData({
      name: '',
      organization: selectedOrganization || '',
      priority: '',
      responseTimeHours: '',
      responseTimeMinutes: '',
      resolutionTimeHours: '',
      resolutionTimeMinutes: '',
      description: '',
      isActive: true,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Convert hours and minutes to total hours (decimal)
      const responseTime = hoursMinutesToHours(formData.responseTimeHours, formData.responseTimeMinutes)
      const resolutionTime = hoursMinutesToHours(formData.resolutionTimeHours, formData.resolutionTimeMinutes)

      if (responseTime <= 0) {
        toast.error('Response time must be greater than 0')
        return
      }

      if (resolutionTime <= 0) {
        toast.error('Resolution time must be greater than 0')
        return
      }

      const submitData = {
        ...formData,
        responseTime: responseTime,
        resolutionTime: resolutionTime,
      }
      // Remove hours/minutes fields before submitting
      delete submitData.responseTimeHours
      delete submitData.responseTimeMinutes
      delete submitData.resolutionTimeHours
      delete submitData.resolutionTimeMinutes

      if (editingPolicy) {
        await adminAPI.updateSLAPolicy(editingPolicy._id, submitData)
        toast.success('SLA Policy updated successfully!')
      } else {
        await adminAPI.createSLAPolicy(submitData)
        toast.success('SLA Policy created successfully!')
      }
      handleCloseModal()
      loadPolicies()
    } catch (error) {
      toast.error(error.message || 'Failed to save SLA Policy')
    }
  }

  const handleDelete = async (policyId) => {
    if (window.confirm('Are you sure you want to delete this SLA Policy?')) {
      try {
        await adminAPI.deleteSLAPolicy(policyId)
        toast.success('SLA Policy deleted successfully!')
        loadPolicies()
      } catch (error) {
        toast.error(error.message || 'Failed to delete SLA Policy')
      }
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'danger'
      case 'high': return 'danger'
      case 'medium': return 'warning'
      case 'low': return 'info'
      default: return 'info'
    }
  }

  const priorityOptions = [
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ]

  // Format time display (hours to hours and minutes)
  const formatTimeDisplay = (totalHours) => {
    if (!totalHours && totalHours !== 0) return '0h 0m'
    const hours = Math.floor(totalHours)
    const minutes = Math.round((totalHours - hours) * 60)
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else if (minutes > 0) {
      return `${minutes}m`
    }
    return '0h 0m'
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
              SLA Policies
            </h1>
            <p className="text-sm text-gray-600">Manage Service Level Agreement policies by organization and priority</p>
          </div>
          <div className="flex gap-3">
            <Select
              label="Filter by Organization"
              value={selectedOrganization}
              onChange={(e) => setSelectedOrganization(e.target.value)}
              options={[
                { value: '', label: 'All Organizations (Global)' },
                ...organizations.map(org => ({
                  value: org._id || org.id,
                  label: org.name,
                })),
              ]}
              className="w-64"
            />
            <Button transparent onClick={() => handleOpenModal()}>
              <Plus size={20} className="mr-2" />
              Add SLA Policy
            </Button>
          </div>
        </div>

        {/* SLA Policies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
              <p className="text-gray-600">Loading SLA policies...</p>
            </div>
          ) : policies.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">No SLA policies found</p>
              <p className="text-sm text-gray-500">Create your first SLA policy to get started</p>
            </div>
          ) : (
            policies.map((policy) => (
              <Card 
                key={policy._id} 
                className="p-6 border-l-4 border-primary-500 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{policy.name || `${policy.priority} Priority`}</h3>
                      <Badge variant={getPriorityColor(policy.priority)}>
                        {policy.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {policy.organization?.name || 'Global Policy'}
                    </p>
                    {policy.description && (
                      <p className="text-xs text-gray-500 mt-1">{policy.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(policy)}
                      className="text-primary-600 hover:text-primary-700 transition-colors p-1"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(policy._id)}
                      className="text-red-600 hover:text-red-700 transition-colors p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Response Time:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatTimeDisplay(policy.responseTime)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Resolution Time:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatTimeDisplay(policy.resolutionTime)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge variant={policy.isActive ? 'success' : 'warning'}>
                      {policy.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingPolicy ? 'Edit SLA Policy' : 'Create SLA Policy'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Policy Name"
              placeholder="e.g., Standard Urgent Policy"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Select
              label="Organization (Leave empty for Global Policy)"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              options={[
                { value: '', label: 'Global (All Organizations)' },
                ...organizations.map(org => ({
                  value: org._id || org.id,
                  label: org.name,
                })),
              ]}
            />

            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              options={priorityOptions}
              required
            />

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Response Time *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Hours"
                      value={formData.responseTimeHours}
                      onChange={(e) => setFormData({ ...formData, responseTimeHours: e.target.value })}
                      required
                    />
                    <span className="text-xs text-gray-500 mt-1 block">Hours</span>
                  </div>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="Minutes"
                      value={formData.responseTimeMinutes}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                          setFormData({ ...formData, responseTimeMinutes: val })
                        }
                      }}
                    />
                    <span className="text-xs text-gray-500 mt-1 block">Minutes (0-59)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Resolution Time *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Hours"
                      value={formData.resolutionTimeHours}
                      onChange={(e) => setFormData({ ...formData, resolutionTimeHours: e.target.value })}
                      required
                    />
                    <span className="text-xs text-gray-500 mt-1 block">Hours</span>
                  </div>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="Minutes"
                      value={formData.resolutionTimeMinutes}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                          setFormData({ ...formData, resolutionTimeMinutes: val })
                        }
                      }}
                    />
                    <span className="text-xs text-gray-500 mt-1 block">Minutes (0-59)</span>
                  </div>
                </div>
              </div>
            </div>

            <Input
              label="Description (Optional)"
              placeholder="Brief description of this SLA policy"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Active
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                transparent
                onClick={handleCloseModal}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                transparent
                className="flex-1"
              >
                {editingPolicy ? 'Update Policy' : 'Create Policy'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}

