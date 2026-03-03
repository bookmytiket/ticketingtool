import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Plus, Edit, Trash2, Building2, User } from 'lucide-react'
import { departmentsAPI, organizationsAPI, usersAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export const Departments = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [departments, setDepartments] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    departmentHead: '',
    organization: '',
    isActive: true,
  })

  useEffect(() => {
    loadDepartments()
    loadOrganizations()
    loadUsers()
  }, [])

  const loadDepartments = async () => {
    try {
      setLoading(true)
      const data = await departmentsAPI.getAll()
      setDepartments(data)
    } catch (error) {
      toast.error('Failed to load departments')
      console.error(error)
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

  const loadUsers = async () => {
    try {
      const data = await usersAPI.getAll()
      setUsers(data)
    } catch (error) {
      console.error('Failed to load users', error)
    }
  }

  const handleOpenModal = (dept = null) => {
    console.log('handleOpenModal called with:', dept)
    if (dept) {
      console.log('Setting editing department:', dept)
      setEditingDept(dept)
      setFormData({
        name: dept.name || '',
        description: dept.description || '',
        departmentHead: dept.departmentHead?._id || dept.departmentHead || '',
        organization: dept.organization?._id || dept.organization || '',
        isActive: dept.isActive !== undefined ? dept.isActive : true,
      })
    } else {
      setEditingDept(null)
      // Regular users can only create departments for their own organization
      const defaultOrg = isAdmin 
        ? (organizations[0]?._id || organizations[0]?.id || '')
        : (user?.organization?._id || user?.organization || '')
      setFormData({
        name: '',
        description: '',
        departmentHead: '',
        organization: defaultOrg,
        isActive: true,
      })
    }
    console.log('Opening modal, isModalOpen will be set to true')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingDept(null)
    setFormData({
      name: '',
      description: '',
      departmentHead: '',
      organization: '',
      isActive: true,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingDept) {
        const deptId = editingDept._id || editingDept.id
        if (!deptId) {
          toast.error('Invalid department ID')
          return
        }
        await departmentsAPI.update(deptId, formData)
        toast.success('Department updated successfully!')
      } else {
        await departmentsAPI.create(formData)
        toast.success('Department created successfully!')
      }
      handleCloseModal()
      loadDepartments()
      loadUsers() // Reload users to reflect role changes
    } catch (error) {
      console.error('Error saving department:', error)
      toast.error(error.message || 'Failed to save department')
    }
  }

  const handleDelete = async (deptId) => {
    console.log('handleDelete called with ID:', deptId)
    if (!deptId) {
      console.error('No department ID provided')
      toast.error('Invalid department ID')
      return
    }
    
    if (window.confirm('Are you sure you want to delete this department? All users in this department will be unassigned.')) {
      try {
        console.log('Calling API to delete department:', deptId)
        await departmentsAPI.delete(deptId)
        console.log('Department deleted successfully')
        toast.success('Department deleted successfully!')
        loadDepartments()
        loadUsers()
      } catch (error) {
        console.error('Error deleting department:', error)
        toast.error(error.message || 'Failed to delete department')
      }
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
              Departments
            </h1>
            <p className="text-sm text-gray-600">Manage departments and assign department heads</p>
          </div>
          <Button transparent onClick={() => handleOpenModal()}>
            <Plus size={20} className="mr-2" />
            Add Department
          </Button>
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
              <p className="text-gray-600">Loading departments...</p>
            </div>
          ) : departments.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">No departments found</p>
              <p className="text-sm text-gray-500">Create your first department to get started</p>
            </div>
          ) : (
            departments.map((dept) => (
              <Card 
                key={dept._id} 
                className="p-6 border-l-4 border-primary-500 hover:shadow-lg transition-all duration-300 relative"
                style={{ position: 'relative' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{dept.name}</h3>
                      <Badge variant={dept.isActive ? 'success' : 'warning'}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {dept.description && (
                      <p className="text-sm text-gray-600 mb-2">{dept.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mb-1">
                      Organization: {dept.organization?.name || 'N/A'}
                    </p>
                    {dept.departmentHead ? (
                      <div className="flex items-center gap-2 mt-2">
                        <User size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-600">
                          Head: {dept.departmentHead?.name || 'N/A'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2">No department head assigned</p>
                    )}
                  </div>
                  <div 
                    className="flex gap-2"
                    style={{ 
                      position: 'relative',
                      zIndex: 1000,
                      pointerEvents: 'auto'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('Edit button clicked for department:', dept)
                        handleOpenModal(dept)
                      }}
                      className="text-primary-600 hover:text-primary-700 transition-colors p-2 rounded hover:bg-primary-50 cursor-pointer"
                      title="Edit Department"
                      style={{ 
                        pointerEvents: 'auto',
                        position: 'relative',
                        zIndex: 1001
                      }}
                    >
                      <Edit size={18} />
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          console.log('Delete button clicked for department:', dept)
                          const deptId = dept._id || dept.id
                          console.log('Department ID:', deptId)
                          if (deptId) {
                            handleDelete(deptId)
                          } else {
                            console.error('Invalid department ID:', dept)
                            toast.error('Invalid department ID')
                          }
                        }}
                        className="text-red-600 hover:text-red-700 transition-colors p-2 rounded hover:bg-red-50 cursor-pointer"
                        title="Delete Department"
                        style={{ 
                          pointerEvents: 'auto',
                          position: 'relative',
                          zIndex: 1001
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
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
          title={editingDept ? 'Edit Department' : 'Create Department'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Department Name"
              placeholder="e.g., IT Support, HR, Finance"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              label="Description (Optional)"
              placeholder="Brief description of the department"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <Select
              label="Organization"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              options={organizations
                .filter(org => isAdmin || (org._id || org.id) === (user?.organization?._id || user?.organization))
                .map(org => ({
                  value: org._id || org.id,
                  label: org.name,
                }))}
              required
              disabled={!isAdmin && user?.organization}
            />

            <Select
              label="Department Head (Optional)"
              value={formData.departmentHead}
              onChange={(e) => setFormData({ ...formData, departmentHead: e.target.value })}
              options={[
                { value: '', label: 'No Department Head' },
                ...users
                  .filter(user => user.role !== 'department-head' || user.department === formData.departmentHead)
                  .map(user => ({
                    value: user._id || user.id,
                    label: `${user.name} (${user.email})`,
                  })),
              ]}
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
                {editingDept ? 'Update Department' : 'Create Department'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}

