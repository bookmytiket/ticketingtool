import { useState } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Plus, Edit, Trash2, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

const mockRoles = [
  { id: 1, name: 'Admin', description: 'Full system access', permissions: ['all'], userCount: 2 },
  { id: 2, name: 'Technician', description: 'Can manage tickets and respond to users', permissions: ['tickets:read', 'tickets:write', 'comments:write'], userCount: 5 },
  { id: 3, name: 'User', description: 'Can create and view own tickets', permissions: ['tickets:read', 'tickets:create'], userCount: 50 },
]

const availablePermissions = [
  { id: 'tickets:read', label: 'View Tickets' },
  { id: 'tickets:create', label: 'Create Tickets' },
  { id: 'tickets:write', label: 'Edit Tickets' },
  { id: 'tickets:delete', label: 'Delete Tickets' },
  { id: 'comments:write', label: 'Add Comments' },
  { id: 'users:read', label: 'View Users' },
  { id: 'users:write', label: 'Manage Users' },
  { id: 'admin:access', label: 'Admin Access' },
]

export const Roles = () => {
  const [roles, setRoles] = useState(mockRoles)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [],
  })

  const handleOpenModal = (role = null) => {
    if (role) {
      setEditingRole(role)
      setFormData({ name: role.name, description: role.description, permissions: role.permissions })
    } else {
      setEditingRole(null)
      setFormData({ name: '', description: '', permissions: [] })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingRole(null)
    setFormData({ name: '', description: '', permissions: [] })
  }

  const handlePermissionToggle = (permissionId) => {
    if (permissionId === 'all') {
      setFormData({ ...formData, permissions: ['all'] })
    } else {
      const newPermissions = formData.permissions.includes(permissionId)
        ? formData.permissions.filter(p => p !== permissionId && p !== 'all')
        : [...formData.permissions.filter(p => p !== 'all'), permissionId]
      setFormData({ ...formData, permissions: newPermissions })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingRole) {
      setRoles(roles.map(r => r.id === editingRole.id ? { ...r, ...formData } : r))
      toast.success('Role updated successfully!')
    } else {
      const newRole = { ...formData, id: roles.length + 1, userCount: 0 }
      setRoles([...roles, newRole])
      toast.success('Role created successfully!')
    }
    handleCloseModal()
  }

  const handleDelete = (roleId) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      setRoles(roles.filter(r => r.id !== roleId))
      toast.success('Role deleted successfully!')
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
            <p className="text-gray-600 mt-1">Define roles and their permissions</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus size={20} className="mr-2" />
            Add Role
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Card key={role.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Shield className="text-primary-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{role.name}</h3>
                    <p className="text-sm text-gray-500">{role.userCount} users</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{role.description}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {role.permissions.slice(0, 3).map((perm) => (
                  <Badge key={perm} variant="info" className="text-xs">
                    {perm === 'all' ? 'All Permissions' : perm}
                  </Badge>
                ))}
                {role.permissions.length > 3 && (
                  <Badge variant="info" className="text-xs">
                    +{role.permissions.length - 3} more
                  </Badge>
                )}
              </div>
              <div className="flex space-x-2 pt-4 border-t border-gray-200">
                <Button variant="outline" size="sm" onClick={() => handleOpenModal(role)} className="flex-1">
                  <Edit size={16} className="mr-1" />
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(role.id)} className="flex-1">
                  <Trash2 size={16} className="mr-1" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingRole ? 'Edit Role' : 'Add New Role'}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
              <Button onClick={handleSubmit}>Save</Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Role Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {availablePermissions.map((perm) => (
                  <label key={perm.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(perm.id) || formData.permissions.includes('all')}
                      onChange={() => handlePermissionToggle(perm.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{perm.label}</span>
                  </label>
                ))}
                <label className="flex items-center space-x-2 cursor-pointer pt-2 border-t border-gray-200">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes('all')}
                    onChange={() => handlePermissionToggle('all')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-900">All Permissions</span>
                </label>
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}

