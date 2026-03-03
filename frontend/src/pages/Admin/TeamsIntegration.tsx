/**
 * Microsoft Teams Integration
 * Admin Only - Configure Microsoft Teams integration
 */

import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { teamsAPI, organizationsAPI, departmentsAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { MessageSquare, CheckCircle, XCircle, Save, Play, Info } from 'lucide-react'
import { format } from 'date-fns'

export const TeamsIntegration = () => {
  const { user } = useAuth()
  const [config, setConfig] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState('')
  const [formData, setFormData] = useState({
    isEnabled: false,
    webhookUrl: '',
    botId: '',
    tenantId: '',
    channelId: '',
    channelName: '',
    notifications: {
      ticketCreated: true,
      ticketUpdated: true,
      ticketResolved: true,
      ticketClosed: true,
      slaBreach: true,
      ticketAssigned: true,
      ticketCommented: false,
    },
    workingHours: {
      enabled: false,
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'UTC',
      daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
    },
    departmentRouting: [],
  })

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData()
    }
  }, [user, selectedOrg])

  const loadData = async () => {
    try {
      setLoading(true)
      const [configData, orgsData, deptsData] = await Promise.all([
        teamsAPI.getConfig(selectedOrg || null),
        organizationsAPI.getAll(),
        departmentsAPI.getAll(),
      ])
      
      if (configData._id) {
        setConfig(configData)
        setFormData({
          isEnabled: configData.isEnabled || false,
          webhookUrl: configData.webhookUrl || '',
          botId: configData.botId || '',
          tenantId: configData.tenantId || '',
          channelId: configData.channelId || '',
          channelName: configData.channelName || '',
          notifications: configData.notifications || formData.notifications,
          workingHours: configData.workingHours || formData.workingHours,
          departmentRouting: configData.departmentRouting || [],
        })
      } else {
        setConfig(null)
      }
      
      setOrganizations(orgsData)
      setDepartments(deptsData)
    } catch (error) {
      console.error('Failed to load Teams settings', error)
      toast.error('Failed to load Teams settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (!formData.webhookUrl && formData.isEnabled) {
        toast.error('Webhook URL is required when integration is enabled')
        return
      }

      setSaving(true)
      
      if (config?._id) {
        await teamsAPI.updateConfig(config._id, formData)
        toast.success('Teams integration settings updated successfully')
      } else {
        await teamsAPI.saveConfig({
          ...formData,
          organization: selectedOrg || null,
        }, selectedOrg || null)
        toast.success('Teams integration settings saved successfully')
      }
      
      loadData()
    } catch (error) {
      console.error('Failed to save Teams settings', error)
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    try {
      if (!formData.webhookUrl) {
        toast.error('Please enter a webhook URL first')
        return
      }

      setTesting(true)
      await teamsAPI.testWebhook(formData.webhookUrl, selectedOrg || null)
      toast.success('Test message sent to Teams channel! Check your Teams channel to verify.')
      loadData() // Reload to update lastTested
    } catch (error) {
      console.error('Failed to test Teams webhook', error)
      toast.error(error.message || 'Failed to send test message. Please check your webhook URL.')
    } finally {
      setTesting(false)
    }
  }

  const handleToggle = () => {
    setFormData({ ...formData, isEnabled: !formData.isEnabled })
  }

  const addDepartmentRoute = () => {
    setFormData({
      ...formData,
      departmentRouting: [
        ...formData.departmentRouting,
        { department: '', channelId: '', channelName: '' },
      ],
    })
  }

  const removeDepartmentRoute = (index) => {
    setFormData({
      ...formData,
      departmentRouting: formData.departmentRouting.filter((_, i) => i !== index),
    })
  }

  const updateDepartmentRoute = (index, field, value) => {
    const updated = [...formData.departmentRouting]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, departmentRouting: updated })
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

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
              Microsoft Teams Integration
            </h1>
            <p className="text-sm text-gray-600">Configure Microsoft Teams bot and notifications</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={formData.isEnabled ? 'success' : 'danger'}>
              {formData.isEnabled ? (
                <>
                  <CheckCircle size={12} className="mr-1" />
                  Enabled
                </>
              ) : (
                <>
                  <XCircle size={12} className="mr-1" />
                  Disabled
                </>
              )}
            </Badge>
            <Button
              transparent
              onClick={handleToggle}
              variant="outline"
              className="text-sm"
            >
              {formData.isEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="text-blue-600 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">How to Get Your Webhook URL</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Open Microsoft Teams and navigate to your channel</li>
                <li>Click the three dots (⋯) next to the channel name</li>
                <li>Select "Connectors" from the menu</li>
                <li>Search for "Incoming Webhook" and click "Configure"</li>
                <li>Give it a name and click "Create"</li>
                <li>Copy the webhook URL and paste it below</li>
              </ol>
            </div>
          </div>
        </Card>

        {/* Configuration Form */}
        <Card>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Integration Settings</h3>
              <p className="text-sm text-gray-600">Configure Microsoft Teams webhook and bot settings</p>
            </div>

            {user.role === 'admin' && organizations.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Organization</label>
                <Select
                  value={selectedOrg}
                  onChange={(e) => {
                    setSelectedOrg(e.target.value)
                  }}
                  options={[
                    { value: '', label: 'Global (All Organizations)' },
                    ...organizations.map(org => ({
                      value: org._id || org.id,
                      label: org.name,
                    })),
                  ]}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Webhook URL <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.webhookUrl}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                placeholder="https://outlook.office.com/webhook/..."
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Get this from your Teams channel connector settings (see instructions above)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bot ID (Optional)
                </label>
                <Input
                  value={formData.botId}
                  onChange={(e) => setFormData({ ...formData, botId: e.target.value })}
                  placeholder="Bot Application ID"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tenant ID (Optional)
                </label>
                <Input
                  value={formData.tenantId}
                  onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  placeholder="Azure AD Tenant ID"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Channel ID (Optional)
                </label>
                <Input
                  value={formData.channelId}
                  onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                  placeholder="Teams Channel ID"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Channel Name (Optional)
                </label>
                <Input
                  value={formData.channelName}
                  onChange={(e) => setFormData({ ...formData, channelName: e.target.value })}
                  placeholder="e.g., IT Support"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Notification Settings
              </label>
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifications.ticketCreated}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, ticketCreated: e.target.checked },
                    })}
                    className="mr-2"
                    disabled={loading}
                  />
                  Notify when ticket is created
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifications.ticketUpdated}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, ticketUpdated: e.target.checked },
                    })}
                    className="mr-2"
                    disabled={loading}
                  />
                  Notify when ticket is updated
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifications.ticketResolved}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, ticketResolved: e.target.checked },
                    })}
                    className="mr-2"
                    disabled={loading}
                  />
                  Notify when ticket is resolved
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifications.ticketClosed}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, ticketClosed: e.target.checked },
                    })}
                    className="mr-2"
                    disabled={loading}
                  />
                  Notify when ticket is closed
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifications.ticketAssigned}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, ticketAssigned: e.target.checked },
                    })}
                    className="mr-2"
                    disabled={loading}
                  />
                  Notify when ticket is assigned
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifications.slaBreach}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, slaBreach: e.target.checked },
                    })}
                    className="mr-2"
                    disabled={loading}
                  />
                  Notify on SLA breach
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifications.ticketCommented}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, ticketCommented: e.target.checked },
                    })}
                    className="mr-2"
                    disabled={loading}
                  />
                  Notify when ticket is commented
                </label>
              </div>
            </div>

            {/* Working Hours */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Working Hours (Optional)
              </label>
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.workingHours.enabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      workingHours: { ...formData.workingHours, enabled: e.target.checked },
                    })}
                    className="mr-2"
                    disabled={loading}
                  />
                  Enable working hours restriction
                </label>
                {formData.workingHours.enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                        <Input
                          type="time"
                          value={formData.workingHours.startTime}
                          onChange={(e) => setFormData({
                            ...formData,
                            workingHours: { ...formData.workingHours, startTime: e.target.value },
                          })}
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">End Time</label>
                        <Input
                          type="time"
                          value={formData.workingHours.endTime}
                          onChange={(e) => setFormData({
                            ...formData,
                            workingHours: { ...formData.workingHours, endTime: e.target.value },
                          })}
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-2">Days of Week</label>
                      <div className="flex flex-wrap gap-2">
                        {dayNames.map((day, index) => (
                          <label key={index} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.workingHours.daysOfWeek.includes(index)}
                              onChange={(e) => {
                                const days = [...formData.workingHours.daysOfWeek]
                                if (e.target.checked) {
                                  days.push(index)
                                } else {
                                  const idx = days.indexOf(index)
                                  if (idx > -1) days.splice(idx, 1)
                                }
                                setFormData({
                                  ...formData,
                                  workingHours: { ...formData.workingHours, daysOfWeek: days.sort() },
                                })
                              }}
                              className="mr-1"
                              disabled={loading}
                            />
                            <span className="text-xs">{day.substring(0, 3)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Department Routing */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Department Routing (Optional)
                </label>
                <Button
                  transparent
                  onClick={addDepartmentRoute}
                  variant="outline"
                  className="text-xs"
                  type="button"
                >
                  Add Route
                </Button>
              </div>
              <div className="space-y-2">
                {formData.departmentRouting.map((route, index) => (
                  <div key={index} className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Department</label>
                      <Select
                        value={route.department?._id || route.department || ''}
                        onChange={(e) => updateDepartmentRoute(index, 'department', e.target.value)}
                        options={[
                          { value: '', label: 'Select Department' },
                          ...departments.map(dept => ({
                            value: dept._id || dept.id,
                            label: dept.name,
                          })),
                        ]}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Channel Name</label>
                      <Input
                        value={route.channelName || ''}
                        onChange={(e) => updateDepartmentRoute(index, 'channelName', e.target.value)}
                        placeholder="Channel name"
                      />
                    </div>
                    <Button
                      transparent
                      onClick={() => removeDepartmentRoute(index)}
                      variant="outline"
                      className="text-red-600"
                      type="button"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                {formData.departmentRouting.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No department routes configured. All notifications will go to the main webhook.
                  </p>
                )}
              </div>
            </div>

            {config?.lastTested && (
              <div className="text-sm text-gray-600">
                Last tested: {format(new Date(config.lastTested), 'MMM dd, yyyy HH:mm')}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                transparent
                onClick={handleTest}
                variant="outline"
                disabled={loading || saving || testing || !formData.webhookUrl}
                className="flex items-center gap-2"
              >
                <Play size={16} />
                {testing ? 'Testing...' : 'Test Webhook'}
              </Button>
              <Button
                transparent
                onClick={handleSave}
                disabled={loading || saving || testing}
                className="flex items-center gap-2"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
