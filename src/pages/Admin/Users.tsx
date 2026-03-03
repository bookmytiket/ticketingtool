import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Plus, Edit, Trash2, Search, Download, Upload } from 'lucide-react'
import { usersAPI, organizationsAPI, departmentsAPI } from '../../services/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export const Users = () => {
  const [users, setUsers] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    status: 'active',
    organization: '',
    department: '',
  })

  useEffect(() => {
    loadUsers()
    loadOrganizations()
    loadDepartments()
  }, [])

  useEffect(() => {
    // Reload departments when organization changes
    if (formData.organization) {
      loadDepartments(formData.organization)
    } else {
      setDepartments([])
    }
  }, [formData.organization])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await usersAPI.getAll()
      setUsers(data)
    } catch (error) {
      toast.error('Failed to load users')
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

  const loadDepartments = async (organizationId = null) => {
    try {
      const data = await departmentsAPI.getAll()
      // Filter by organization if provided
      const filtered = organizationId 
        ? data.filter(dept => (dept.organization?._id || dept.organization) === organizationId)
        : data
      setDepartments(filtered)
    } catch (error) {
      console.error('Failed to load departments', error)
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Don't show existing password
        role: user.role,
        status: user.status,
        organization: user.organization?._id || user.organization || '',
        department: user.department?._id || user.department || '',
      })
      // Load departments for this user's organization
      if (user.organization?._id || user.organization) {
        loadDepartments(user.organization?._id || user.organization)
      }
    } else {
      setEditingUser(null)
      setFormData({ name: '', email: '', password: '', role: '', status: 'active', organization: '', department: '' })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
    setFormData({ name: '', email: '', password: '', role: '', status: 'active', organization: '', department: '' })
    setDepartments([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Prepare data - only include password if provided
      const submitData = { ...formData }
      if (editingUser && !submitData.password) {
        // Remove password if editing and not provided
        delete submitData.password
      }

      if (editingUser) {
        await usersAPI.update(editingUser._id || editingUser.id, submitData)
        toast.success('User updated successfully!')
      } else {
        // Password and organization are required for new users
        if (!submitData.password) {
          toast.error('Password is required for new users')
          return
        }
        if (!submitData.organization) {
          toast.error('Organization is required for new users')
          return
        }
        await usersAPI.create(submitData)
        toast.success('User created successfully!')
      }
      handleCloseModal()
      loadUsers()
    } catch (error) {
      toast.error(error.message || 'Failed to save user')
    }
  }

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersAPI.delete(userId)
        toast.success('User deleted successfully!')
        loadUsers()
      } catch (error) {
        toast.error(error.message || 'Failed to delete user')
      }
    }
  }

  const handleExportUsers = () => {
    const headers = ['Name', 'Email', 'Password', 'Role', 'Status', 'Organization', 'Department']
    const rows = users.map(user => [
      user.name,
      user.email,
      '', // Password not exported for security
      user.role,
      user.status,
      user.organization?.name || 'N/A',
      user.department?.name || 'N/A',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Users exported successfully!')
  }

  const handleImportUsers = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        toast.error('CSV file must contain at least a header row and one data row')
        return
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
      const nameIndex = headers.indexOf('Name')
      const emailIndex = headers.indexOf('Email')
      const passwordIndex = headers.indexOf('Password')
      const roleIndex = headers.indexOf('Role')
      const statusIndex = headers.indexOf('Status')
      const orgIndex = headers.indexOf('Organization')
      const deptIndex = headers.indexOf('Department')

      if (nameIndex === -1 || emailIndex === -1) {
        toast.error('CSV must contain Name and Email columns')
        return
      }

      const usersToImport = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim())
        const name = values[nameIndex]
        const email = values[emailIndex]
        
        if (!name || !email) continue

        // Find organization by name
        let organizationId = ''
        if (orgIndex !== -1 && values[orgIndex]) {
          const org = organizations.find(o => o.name === values[orgIndex])
          if (org) {
            organizationId = org._id || org.id
          } else {
            toast.error(`Organization "${values[orgIndex]}" not found for user ${email}`)
            continue
          }
        }

        // Find department by name
        let departmentId = ''
        if (deptIndex !== -1 && values[deptIndex] && organizationId) {
          const dept = departments.find(d => 
            d.name === values[deptIndex] && 
            (d.organization?._id || d.organization) === organizationId
          )
          if (dept) departmentId = dept._id || dept.id
        }

        usersToImport.push({
          name,
          email,
          password: passwordIndex !== -1 && values[passwordIndex] ? values[passwordIndex] : 'TempPassword123!',
          role: roleIndex !== -1 && values[roleIndex] ? values[roleIndex] : 'user',
          status: statusIndex !== -1 && values[statusIndex] ? values[statusIndex] : 'active',
          organization: organizationId || organizations[0]?._id || organizations[0]?.id,
          department: departmentId || '',
        })
      }

      if (usersToImport.length === 0) {
        toast.error('No valid users found in CSV')
        return
      }

      // Import users
      let successCount = 0
      let errorCount = 0
      for (const userData of usersToImport) {
        try {
          await usersAPI.create(userData)
          successCount++
        } catch (error) {
          errorCount++
          console.error(`Failed to import user ${userData.email}:`, error)
        }
      }

      toast.success(`Imported ${successCount} users${errorCount > 0 ? `, ${errorCount} failed` : ''}`)
      loadUsers()
      e.target.value = '' // Reset file input
    } catch (error) {
      toast.error('Failed to import users: ' + error.message)
      console.error(error)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
              User Management
            </h1>
            <p className="text-sm text-gray-600">Manage system users and their permissions</p>
          </div>
          <div className="flex gap-3">
            <Button 
              transparent
              variant="outline"
              onClick={handleExportUsers}
            >
              <Download size={20} className="mr-2" />
              Export CSV
            </Button>
            <label className="btn btn-outline cursor-pointer">
              <Upload size={20} className="mr-2" />
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleImportUsers}
                className="hidden"
              />
            </label>
            <Button onClick={() => handleOpenModal()} transparent>
              <Plus size={20} className="mr-2" />
              Add User
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">No users found</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id || user.id} className="hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent transition-all duration-300 border-l-4 border-transparent hover:border-primary-500">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary-100/80 backdrop-blur-sm text-primary-700 border border-primary-200">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.organization?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.department?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={user.role === 'admin' ? 'danger' : user.role === 'technician' ? 'info' : user.role === 'department-head' ? 'warning' : 'info'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={user.status === 'active' ? 'success' : 'warning'}>
                        {user.status}
                      </Badge>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="text-primary-600 hover:text-primary-700 transition-colors p-2 rounded-lg hover:bg-primary-50/50 backdrop-blur-sm"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                            onClick={() => handleDelete(user._id || user.id)}
                          className="text-red-600 hover:text-red-700 transition-colors p-2 rounded-lg hover:bg-red-50/50 backdrop-blur-sm"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingUser ? 'Edit User' : 'Add New User'}
          footer={
            <>
              <Button variant="outline" transparent onClick={handleCloseModal}>Cancel</Button>
              <Button transparent onClick={handleSubmit}>Save</Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              type="email"
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              type="password"
              label={editingUser ? "Password (Leave empty to keep current)" : "Password *"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
              placeholder={editingUser ? "Enter new password or leave empty" : "Enter password"}
            />
            <Select
              label="Organization *"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value, department: '' })}
              options={organizations.map(org => ({
                value: org._id || org.id,
                label: org.name,
              }))}
              required
            />
            <Select
              label="Department (Optional)"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              options={[
                { value: '', label: 'No Department' },
                ...departments.map(dept => ({
                  value: dept._id || dept.id,
                  label: dept.name,
                })),
              ]}
              disabled={!formData.organization}
            />
            <Select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              options={[
                { value: 'user', label: 'User' },
                { value: 'technician', label: 'Technician' },
                { value: 'admin', label: 'Admin' },
                { value: 'department-head', label: 'Department Head' },
              ]}
              required
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
          </form>
        </Modal>
      </div>
    </Layout>
  )
}

