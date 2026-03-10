/**
 * External API Integrations Management
 * Admin Only - Manage external API integrations, webhooks, and Azure Sentinel
 */

import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { integrationsAPI, organizationsAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { 
  Plug, Plus, Copy, Trash2, Edit, CheckCircle, XCircle, 
  Globe, Key, Shield, Activity 
} from 'lucide-react'

export const ExternalIntegrations = () => {
  const { user } = useAuth()
  const [integrations, setIntegrations] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingIntegration, setEditingIntegration] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'webhook',
    description: '',
    organization: '',
    isActive: true,
    config: {
      url: '',
      method: 'POST',
      headers: {},
      authType: 'none',
      authConfig: {
        bearerToken: '',
        username: '',
        password: '',
        apiKey: '',
        apiKeyHeader: 'X-API-Key',
      },
      fieldMapping: {
        title: 'title',
        description: 'description',
        priority: 'priority',
        category: 'category',
      },
      // Azure Sentinel specific
      workspaceId: '',
      subscriptionId: '',
      resourceGroup: '',
    },
  })

  useEffect(() => {
    if (user?.role === 'admin') {
      loadIntegrations()
      loadOrganizations()
    }
  }, [user])

  const loadIntegrations = async () => {
    try {
      setLoading(true)
      const data = await integrationsAPI.getAll()
      setIntegrations(data)
    } catch (error) {
      console.error('Failed to load integrations', error)
      toast.error('Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  const loadOrganizations = async () => {
    try {
      const data = await organizationsAPI.getAll()
      setOrganizations(data)
    } catch (error) {
      console.error('Failed to load organizations', error)
    }
  }

  const handleCreate = async () => {
    try {
      if (!formData.name) {
        toast.error('Integration name is required')
        return
      }

      const integrationData = {
        ...formData,
        organization: formData.organization || null,
      }

      await integrationsAPI.create(integrationData)
      toast.success('Integration created successfully!')
      setShowCreateModal(false)
      resetForm()
      loadIntegrations()
    } catch (error) {
      console.error('Failed to create integration', error)
      toast.error(error.message || 'Failed to create integration')
    }
  }

  const handleEdit = (integration) => {
    setEditingIntegration(integration)
    setFormData({
      name: integration.name,
      type: integration.type,
      description: integration.description || '',
      organization: integration.organization?._id || integration.organization || '',
      isActive: integration.isActive,
      config: {
        ...integration.config,
        fieldMapping: integration.config.fieldMapping || {
          title: 'title',
          description: 'description',
          priority: 'priority',
          category: 'category',
        },
      },
    })
    setShowEditModal(true)
  }

  const handleUpdate = async () => {
    try {
      if (!formData.name) {
        toast.error('Integration name is required')
        return
      }

      const integrationData = {
        ...formData,
        organization: formData.organization || null,
      }

      await integrationsAPI.update(editingIntegration._id, integrationData)
      toast.success('Integration updated successfully!')
      setShowEditModal(false)
      resetForm()
      loadIntegrations()
    } catch (error) {
      console.error('Failed to update integration', error)
      toast.error(error.message || 'Failed to update integration')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this integration? This action cannot be undone.')) {
      return
    }

    try {
      await integrationsAPI.delete(id)
      toast.success('Integration deleted successfully')
      loadIntegrations()
    } catch (error) {
      console.error('Failed to delete integration', error)
      toast.error('Failed to delete integration')
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'webhook',
      description: '',
      organization: '',
      isActive: true,
      config: {
        url: '',
        method: 'POST',
        headers: {},
        authType: 'none',
        authConfig: {
          bearerToken: '',
          username: '',
          password: '',
          apiKey: '',
          apiKeyHeader: 'X-API-Key',
        },
        fieldMapping: {
          title: 'title',
          description: 'description',
          priority: 'priority',
          category: 'category',
        },
        workspaceId: '',
        subscriptionId: '',
        resourceGroup: '',
      },
    })
    setEditingIntegration(null)
  }

  const getWebhookUrl = (integration) => {
    if (integration.webhookUrl) {
      const baseUrl = window.location.origin
      return `${baseUrl}${integration.webhookUrl}`
    }
    return 'N/A'
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
              External Integrations
            </h1>
            <p className="text-sm text-gray-600">Manage external API integrations, webhooks, and Azure Sentinel</p>
          </div>
          <Button
            transparent
            onClick={() => {
              resetForm()
              setShowCreateModal(true)
            }}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Create Integration
          </Button>
        </div>

        {/* Integrations List */}
        <Card>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
              <p className="text-gray-600">Loading integrations...</p>
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-12">
              <Plug className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">No integrations found. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Webhook URL</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Triggers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {integrations.map((integration) => (
                    <tr key={integration._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{integration.name}</div>
                        {integration.description && (
                          <div className="text-sm text-gray-500">{integration.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={integration.type === 'azure-sentinel' ? 'info' : 'default'}>
                          {integration.type === 'azure-sentinel' ? 'Azure Sentinel' : integration.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                            {getWebhookUrl(integration)}
                          </code>
                          {integration.webhookUrl && (
                            <Button
                              transparent
                              onClick={() => handleCopy(getWebhookUrl(integration))}
                              className="p-1"
                              type="button"
                            >
                              <Copy size={14} />
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {integration.isActive ? (
                          <Badge variant="success">
                            <CheckCircle size={12} className="mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="danger">
                            <XCircle size={12} className="mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {integration.triggerCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Button
                            transparent
                            onClick={() => handleEdit(integration)}
                            className="text-blue-600 hover:text-blue-700"
                            type="button"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            transparent
                            onClick={() => handleDelete(integration._id)}
                            className="text-red-600 hover:text-red-700"
                            type="button"
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
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false)
            setShowEditModal(false)
            resetForm()
          }}
          title={showEditModal ? 'Edit Integration' : 'Create Integration'}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Azure Sentinel Production"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Type *</label>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                options={[
                  { value: 'azure-sentinel', label: 'Azure Sentinel' },
                  { value: 'webhook', label: 'Generic Webhook' },
                  { value: 'api', label: 'External API' },
                  { value: 'custom', label: 'Custom' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this integration..."
                rows={3}
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

            {formData.type === 'azure-sentinel' && (
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">Azure Sentinel Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Workspace ID"
                    value={formData.config.workspaceId}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, workspaceId: e.target.value }
                    })}
                    placeholder="Azure Sentinel Workspace ID"
                  />
                  <Input
                    label="Subscription ID"
                    value={formData.config.subscriptionId}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, subscriptionId: e.target.value }
                    })}
                    placeholder="Azure Subscription ID"
                  />
                </div>
                <Input
                  label="Resource Group"
                  value={formData.config.resourceGroup}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: { ...formData.config, resourceGroup: e.target.value }
                  })}
                  placeholder="Resource Group Name"
                />
                <div className="mt-4 p-3 bg-blue-100 rounded text-xs text-blue-800">
                  <p className="font-medium mb-1">📋 Field Mapping:</p>
                  <p>Map Azure Sentinel alert fields to ticket fields:</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input
                      label="Title Field"
                      value={formData.config.fieldMapping.title}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          fieldMapping: { ...formData.config.fieldMapping, title: e.target.value }
                        }
                      })}
                      placeholder="AlertDisplayName"
                    />
                    <Input
                      label="Description Field"
                      value={formData.config.fieldMapping.description}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          fieldMapping: { ...formData.config.fieldMapping, description: e.target.value }
                        }
                      })}
                      placeholder="Description"
                    />
                    <Input
                      label="Priority Field"
                      value={formData.config.fieldMapping.priority}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          fieldMapping: { ...formData.config.fieldMapping, priority: e.target.value }
                        }
                      })}
                      placeholder="Severity"
                    />
                    <Input
                      label="Category Field"
                      value={formData.config.fieldMapping.category}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          fieldMapping: { ...formData.config.fieldMapping, category: e.target.value }
                        }
                      })}
                      placeholder="Category"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                Active
              </label>
            </div>

            {showEditModal && editingIntegration?.webhookUrl && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-semibold text-yellow-800 mb-2">Webhook URL:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-yellow-900 font-mono bg-yellow-100 px-2 py-1 rounded flex-1">
                    {getWebhookUrl(editingIntegration)}
                  </code>
                  <Button
                    transparent
                    onClick={() => handleCopy(getWebhookUrl(integration))}
                    className="p-1"
                    type="button"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
                <p className="text-xs text-yellow-700 mt-2">
                  Use this URL in Azure Sentinel to send alerts to this integration.
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button
                transparent
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                  resetForm()
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button transparent onClick={showEditModal ? handleUpdate : handleCreate}>
                {showEditModal ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}

