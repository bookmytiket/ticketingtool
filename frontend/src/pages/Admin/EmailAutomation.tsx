/**
 * Email Automation Management
 * Admin Only - Manage email automation schedules and templates
 */

import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { emailAutomationAPI, emailTemplatesAPI, organizationsAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Mail, Plus, Play, Edit, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

export const EmailAutomation = () => {
  const { user } = useAuth()
  const [automations, setAutomations] = useState([])
  const [templates, setTemplates] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'daily-open-tickets',
    organization: '',
    isEnabled: true,
    schedule: {
      time: '09:00',
      timezone: 'UTC',
      dayOfWeek: null,
      dayOfMonth: null,
    },
    recipients: {
      admins: true,
      organizationManagers: true,
      departmentHeads: true,
      technicians: false,
    },
    reportFormat: ['html'],
    emailTemplate: '',
  })

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const [automationsData, templatesData, orgsData] = await Promise.all([
        emailAutomationAPI.getAll(),
        emailTemplatesAPI.getAll(),
        organizationsAPI.getAll(),
      ])
      setAutomations(automationsData)
      setTemplates(templatesData)
      setOrganizations(orgsData)
    } catch (error) {
      console.error('Failed to load data', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingAutomation(null)
    setFormData({
      name: '',
      type: 'daily-open-tickets',
      organization: '',
      isEnabled: true,
      schedule: {
        time: '09:00',
        timezone: 'UTC',
        dayOfWeek: null,
        dayOfMonth: null,
      },
      recipients: {
        admins: true,
        organizationManagers: true,
        departmentHeads: true,
        technicians: false,
      },
      reportFormat: ['html'],
      emailTemplate: '',
    })
    setShowCreateModal(true)
  }

  const handleEdit = (automation) => {
    setEditingAutomation(automation)
    setFormData({
      name: automation.name,
      type: automation.type,
      organization: automation.organization?._id || automation.organization || '',
      isEnabled: automation.isEnabled,
      schedule: automation.schedule,
      recipients: automation.recipients,
      reportFormat: automation.reportFormat,
      emailTemplate: automation.emailTemplate?._id || automation.emailTemplate || '',
    })
    setShowCreateModal(true)
  }

  const handleSubmit = async () => {
    try {
      if (!formData.name) {
        toast.error('Name is required')
        return
      }

      const automationData = {
        ...formData,
        organization: formData.organization || null,
        emailTemplate: formData.emailTemplate || null,
      }

      if (editingAutomation) {
        await emailAutomationAPI.update(editingAutomation._id, automationData)
        toast.success('Automation updated successfully')
      } else {
        await emailAutomationAPI.create(automationData)
        toast.success('Automation created successfully')
      }

      setShowCreateModal(false)
      loadData()
    } catch (error) {
      console.error('Failed to save automation', error)
      toast.error(error.message || 'Failed to save automation')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this automation?')) {
      return
    }

    try {
      await emailAutomationAPI.delete(id)
      toast.success('Automation deleted successfully')
      loadData()
    } catch (error) {
      console.error('Failed to delete automation', error)
      toast.error('Failed to delete automation')
    }
  }

  const handleRun = async (id) => {
    try {
      await emailAutomationAPI.run(id)
      toast.success('Automation run triggered successfully')
    } catch (error) {
      console.error('Failed to run automation', error)
      toast.error('Failed to run automation')
    }
  }

  const handleToggle = async (automation) => {
    try {
      await emailAutomationAPI.update(automation._id, {
        isEnabled: !automation.isEnabled,
      })
      toast.success(`Automation ${!automation.isEnabled ? 'enabled' : 'disabled'}`)
      loadData()
    } catch (error) {
      console.error('Failed to toggle automation', error)
      toast.error('Failed to toggle automation')
    }
  }

  if (!user || user.role !== 'admin') {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Access denied. Admin access required.</p>
        </div>
      </Layout>
    )
  }

  const getTypeLabel = (type) => {
    const labels = {
      'daily-open-tickets': 'Daily Open Tickets',
      'daily-report': 'Daily Report',
      'weekly-report': 'Weekly Report',
      'monthly-report': 'Monthly Report',
    }
    return labels[type] || type
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
              Email Automation
            </h1>
            <p className="text-sm text-gray-600">Manage automated email reports and notifications</p>
          </div>
          <Button
            transparent
            onClick={handleCreate}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Create Automation
          </Button>
        </div>

        {/* Automations List */}
        <Card>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
              <p className="text-gray-600">Loading automations...</p>
            </div>
          ) : automations.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">No automations found. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Sent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {automations.map((automation) => (
                    <tr key={automation._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {automation.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getTypeLabel(automation.type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {automation.organization?.name || 'Global'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          {automation.schedule?.time || 'N/A'}
                          {automation.type === 'weekly-report' && automation.schedule?.dayOfWeek !== null && (
                            <span className="text-xs">(Day {automation.schedule.dayOfWeek})</span>
                          )}
                          {automation.type === 'monthly-report' && automation.schedule?.dayOfMonth !== null && (
                            <span className="text-xs">(Day {automation.schedule.dayOfMonth})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {automation.isEnabled ? (
                          <Badge variant="success">
                            <CheckCircle size={12} className="mr-1" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="danger">
                            <XCircle size={12} className="mr-1" />
                            Disabled
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {automation.lastSent
                          ? format(new Date(automation.lastSent), 'MMM dd, yyyy HH:mm')
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Button
                            transparent
                            onClick={() => handleRun(automation._id)}
                            className="text-blue-600 hover:text-blue-700"
                            type="button"
                            title="Run Now"
                          >
                            <Play size={16} />
                          </Button>
                          <Button
                            transparent
                            onClick={() => handleEdit(automation)}
                            className="text-primary-600 hover:text-primary-700"
                            type="button"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            transparent
                            onClick={() => handleToggle(automation)}
                            className={automation.isEnabled ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}
                            type="button"
                            title={automation.isEnabled ? 'Disable' : 'Enable'}
                          >
                            {automation.isEnabled ? <XCircle size={16} /> : <CheckCircle size={16} />}
                          </Button>
                          <Button
                            transparent
                            onClick={() => handleDelete(automation._id)}
                            className="text-red-600 hover:text-red-700"
                            type="button"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Create/Edit Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={editingAutomation ? 'Edit Automation' : 'Create Automation'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Daily Open Tickets Report"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
              <Select
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value
                  setFormData({
                    ...formData,
                    type: newType,
                    recipients: {
                      ...formData.recipients,
                      technicians: newType === 'daily-open-tickets',
                    },
                  })
                }}
                options={[
                  { value: 'daily-open-tickets', label: 'Daily Open Tickets' },
                  { value: 'daily-report', label: 'Daily Report' },
                  { value: 'weekly-report', label: 'Weekly Report' },
                  { value: 'monthly-report', label: 'Monthly Report' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Organization</label>
              <Select
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
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Schedule Time (HH:mm)</label>
              <Input
                type="time"
                value={formData.schedule.time}
                onChange={(e) => setFormData({
                  ...formData,
                  schedule: { ...formData.schedule, time: e.target.value },
                })}
              />
            </div>
            {formData.type === 'weekly-report' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Day of Week (0=Sunday, 1=Monday, etc.)</label>
                <Input
                  type="number"
                  min="0"
                  max="6"
                  value={formData.schedule.dayOfWeek || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    schedule: { ...formData.schedule, dayOfWeek: parseInt(e.target.value) || null },
                  })}
                />
              </div>
            )}
            {formData.type === 'monthly-report' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Day of Month (1-31)</label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.schedule.dayOfMonth || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    schedule: { ...formData.schedule, dayOfMonth: parseInt(e.target.value) || null },
                  })}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Recipients</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.recipients.admins}
                    onChange={(e) => setFormData({
                      ...formData,
                      recipients: { ...formData.recipients, admins: e.target.checked },
                    })}
                    className="mr-2"
                  />
                  Admins
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.recipients.organizationManagers}
                    onChange={(e) => setFormData({
                      ...formData,
                      recipients: { ...formData.recipients, organizationManagers: e.target.checked },
                    })}
                    className="mr-2"
                  />
                  Organization Managers
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.recipients.departmentHeads}
                    onChange={(e) => setFormData({
                      ...formData,
                      recipients: { ...formData.recipients, departmentHeads: e.target.checked },
                    })}
                    className="mr-2"
                  />
                  Department Heads
                </label>
                {formData.type === 'daily-open-tickets' && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.recipients.technicians}
                      onChange={(e) => setFormData({
                        ...formData,
                        recipients: { ...formData.recipients, technicians: e.target.checked },
                      })}
                      className="mr-2"
                    />
                    Technicians
                  </label>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Template (Optional)</label>
              <Select
                value={formData.emailTemplate}
                onChange={(e) => setFormData({ ...formData, emailTemplate: e.target.value })}
                options={[
                  { value: '', label: 'Use Default Template' },
                  ...templates
                    .filter(t => t.type === formData.type)
                    .map(template => ({
                      value: template._id || template.id,
                      label: template.name,
                    })),
                ]}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                transparent
                onClick={() => setShowCreateModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button transparent onClick={handleSubmit}>
                {editingAutomation ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}

