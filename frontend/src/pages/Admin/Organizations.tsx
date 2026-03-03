import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Plus, Edit, Trash2, Building2 } from 'lucide-react'
import { organizationsAPI } from '../../services/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export const Organizations = () => {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    description: '',
    status: 'active',
  })

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      setLoading(true)
      const data = await organizationsAPI.getAll()
      setOrganizations(data)
    } catch (error) {
      toast.error('Failed to load organizations')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (org = null) => {
    try {
      if (org) {
        setEditingOrg(org)
        setFormData({
          name: org.name || '',
          domain: org.domain || '',
          description: org.description || '',
          status: org.status || 'active',
        })
      } else {
        setEditingOrg(null)
        setFormData({
          name: '',
          domain: '',
          description: '',
          status: 'active',
        })
      }
      setIsModalOpen(true)
    } catch (error) {
      console.error('Error opening modal:', error)
      toast.error('Failed to open edit form')
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingOrg(null)
      setFormData({
        name: '',
        domain: '',
        description: '',
        status: 'active',
      })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingOrg) {
        const orgId = editingOrg._id || editingOrg.id
        if (!orgId) {
          toast.error('Invalid organization ID')
          console.error('Editing org:', editingOrg)
          return
        }
        console.log('Updating organization:', orgId, formData)
        await organizationsAPI.update(orgId, formData)
        toast.success('Organization updated successfully!')
      } else {
        await organizationsAPI.create(formData)
        toast.success('Organization created successfully!')
      }
      handleCloseModal()
      loadOrganizations()
    } catch (error) {
      console.error('Error saving organization:', error)
      toast.error(error.message || 'Failed to save organization')
    }
  }

  const handleDelete = async (orgId) => {
    if (!orgId) {
      toast.error('Invalid organization ID')
      console.error('No organization ID provided')
      return
    }
    
    if (window.confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      try {
        console.log('Deleting organization:', orgId)
        await organizationsAPI.delete(orgId)
        toast.success('Organization deleted successfully!')
        loadOrganizations()
      } catch (error) {
        console.error('Delete error:', error)
        toast.error(error.message || 'Failed to delete organization')
      }
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-cyber font-bold neon-text uppercase tracking-wider mb-2">Organizations</h1>
            <p className="text-cyber-neon-cyan/70 font-mono uppercase tracking-widest text-sm">Manage Multi-Tenant Organizations</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="btn-primary">
            <Plus size={20} className="mr-2" />
            Add Organization
          </Button>
        </div>

        <Card className="p-6">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin text-cyber-neon-cyan text-4xl mb-4">⟳</div>
                <p className="text-cyber-neon-cyan/70 font-mono">Loading organizations...</p>
              </div>
            ) : organizations.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="mx-auto text-cyber-neon-cyan/50 mb-4" size={48} />
                <p className="text-cyber-neon-cyan/70 font-mono">No organizations found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizations.map((org) => (
                  <div
                    key={org._id || org.id}
                    className="card p-6 border-2 border-cyber-neon-cyan/30 hover:border-cyber-neon-cyan/50 transition-all duration-300 cyber-3d relative"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-cyber-neon-cyan/20 p-3 rounded-lg border-2 border-cyber-neon-cyan/30">
                          <Building2 className="text-cyber-neon-cyan" size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-cyber font-bold text-cyber-neon-cyan neon-text">{org.name}</h3>
                          {org.domain && (
                            <p className="text-sm text-cyber-neon-cyan/70 font-mono">{org.domain}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={org.status === 'active' ? 'success' : 'warning'}>
                        {org.status}
                      </Badge>
                    </div>

                    {org.description && (
                      <p className="text-sm text-cyber-neon-cyan/80 font-mono mb-4 line-clamp-2">{org.description}</p>
                    )}

                    {org.stats && (
                      <div className="grid grid-cols-3 gap-2 mb-4 pt-4 border-t-2 border-cyber-neon-cyan/20">
                        <div className="text-center">
                          <p className="text-xs font-cyber text-cyber-neon-cyan/70 uppercase tracking-widest">Users</p>
                          <p className="text-lg font-cyber font-bold text-cyber-neon-cyan">{org.stats.users || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-cyber text-cyber-neon-cyan/70 uppercase tracking-widest">Tickets</p>
                          <p className="text-lg font-cyber font-bold text-cyber-neon-cyan">{org.stats.tickets || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-cyber text-cyber-neon-cyan/70 uppercase tracking-widest">Open</p>
                          <p className="text-lg font-cyber font-bold text-cyber-neon-yellow">{org.stats.openTickets || 0}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t-2 border-cyber-neon-cyan/20">
                      <p className="text-xs text-cyber-neon-cyan/50 font-mono">
                        {format(new Date(org.createdAt), 'MMM dd, yyyy')}
                      </p>
                      <div className="flex items-center space-x-2 relative z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (org) {
                              handleOpenModal(org)
                            }
                          }}
                          className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Organization"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const orgId = org._id || org.id
                            if (orgId) {
                              handleDelete(orgId)
                            }
                          }}
                          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Organization"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingOrg ? 'Edit Organization' : 'Add New Organization'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Organization Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Domain (optional)"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              placeholder="example.com"
            />
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Organization description"
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              required
            />
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
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
                {editingOrg ? 'Update' : 'Create'} Organization
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}

