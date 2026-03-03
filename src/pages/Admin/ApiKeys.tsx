/**
 * API Keys Management
 * Admin Only - Manage API keys for external integrations
 */

import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { apiKeysAPI, organizationsAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Key, Plus, Copy, Trash2, Eye, EyeOff, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { format } from 'date-fns'

export const ApiKeys = () => {
  const { user } = useAuth()
  const [apiKeys, setApiKeys] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [newKey, setNewKey] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    permissions: ['read'],
    expiresAt: '',
    rateLimit: 1000,
  })

  useEffect(() => {
    if (user?.role === 'admin') {
      loadApiKeys()
      loadOrganizations()
    }
  }, [user])

  const loadApiKeys = async () => {
    try {
      setLoading(true)
      const data = await apiKeysAPI.getAll()
      setApiKeys(data)
    } catch (error) {
      console.error('Failed to load API keys', error)
      toast.error('Failed to load API keys')
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
        toast.error('API key name is required')
        return
      }

      const keyData = {
        ...formData,
        organization: formData.organization || null,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      }

      const created = await apiKeysAPI.create(keyData)
      setNewKey(created.key)
      setShowCreateModal(false)
      setShowKeyModal(true)
      setFormData({
        name: '',
        organization: '',
        permissions: ['read'],
        expiresAt: '',
        rateLimit: 1000,
      })
      loadApiKeys()
      toast.success('API key created successfully!')
    } catch (error) {
      console.error('Failed to create API key', error)
      toast.error(error.message || 'Failed to create API key')
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    try {
      await apiKeysAPI.delete(id)
      toast.success('API key deleted successfully')
      loadApiKeys()
    } catch (error) {
      console.error('Failed to delete API key', error)
      toast.error('Failed to delete API key')
    }
  }

  const handleRevoke = async (id) => {
    try {
      await apiKeysAPI.revoke(id)
      toast.success('API key revoked successfully')
      loadApiKeys()
    } catch (error) {
      console.error('Failed to revoke API key', error)
      toast.error('Failed to revoke API key')
    }
  }

  const handleActivate = async (id) => {
    try {
      await apiKeysAPI.activate(id)
      toast.success('API key activated successfully')
      loadApiKeys()
    } catch (error) {
      console.error('Failed to activate API key', error)
      toast.error('Failed to activate API key')
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
              API Keys
            </h1>
            <p className="text-sm text-gray-600">Manage API keys for external integrations</p>
          </div>
          <Button
            transparent
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Create API Key
          </Button>
        </div>

        {/* API Keys List */}
        <Card>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
              <p className="text-gray-600">Loading API keys...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">No API keys found. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {apiKeys.map((key) => (
                    <tr key={key._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {key.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {key.keyPrefix}
                        <Button
                          transparent
                          onClick={() => handleCopy(key.keyPrefix)}
                          className="ml-2 p-1"
                          type="button"
                        >
                          <Copy size={14} />
                        </Button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {key.organization?.name || 'Global'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          {key.permissions.map((perm) => (
                            <Badge key={perm} variant="info" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {key.isActive ? (
                          <Badge variant="success">
                            <CheckCircle size={12} className="mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="danger">
                            <XCircle size={12} className="mr-1" />
                            Revoked
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {key.lastUsed ? format(new Date(key.lastUsed), 'MMM dd, yyyy HH:mm') : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {key.usageCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {key.isActive ? (
                            <Button
                              transparent
                              onClick={() => handleRevoke(key._id)}
                              className="text-red-600 hover:text-red-700"
                              type="button"
                            >
                              Revoke
                            </Button>
                          ) : (
                            <Button
                              transparent
                              onClick={() => handleActivate(key._id)}
                              className="text-green-600 hover:text-green-700"
                              type="button"
                            >
                              Activate
                            </Button>
                          )}
                          <Button
                            transparent
                            onClick={() => handleDelete(key._id)}
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

        {/* Create Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create API Key"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Production API Key"
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Permissions</label>
              <Select
                value={formData.permissions.join(',')}
                onChange={(e) => setFormData({ ...formData, permissions: e.target.value.split(',') })}
                options={[
                  { value: 'read', label: 'Read Only' },
                  { value: 'read,write', label: 'Read & Write' },
                  { value: 'read,write,admin', label: 'Full Access' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Expires At (Optional)</label>
              <Input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Rate Limit (requests/hour)</label>
              <Input
                type="number"
                value={formData.rateLimit}
                onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) || 1000 })}
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
              <Button transparent onClick={handleCreate}>
                Create
              </Button>
            </div>
          </div>
        </Modal>

        {/* Show Key Modal */}
        <Modal
          isOpen={showKeyModal}
          onClose={() => setShowKeyModal(false)}
          title="API Key Created"
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-semibold mb-2">
                ⚠️ Important: Save this key now!
              </p>
              <p className="text-sm text-yellow-700">
                This is the only time you'll be able to see the full API key. Make sure to copy and store it securely.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your API Key</label>
              <div className="flex items-center gap-2">
                <Input
                  value={newKey || ''}
                  readOnly
                  className="font-mono"
                />
                <Button
                  transparent
                  onClick={() => handleCopy(newKey)}
                  className="flex items-center gap-2"
                  type="button"
                >
                  <Copy size={16} />
                  Copy
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button transparent onClick={() => setShowKeyModal(false)}>
                I've Saved It
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}

