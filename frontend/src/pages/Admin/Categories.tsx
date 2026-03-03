import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Plus, Edit, Trash2, Tag } from 'lucide-react'
import { categoriesAPI, organizationsAPI } from '../../services/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export const Categories = () => {
  const [categories, setCategories] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#00ffff',
    organization: '',
    status: 'active',
  })

  useEffect(() => {
    loadCategories()
    loadOrganizations()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await categoriesAPI.getAllAdmin()
      setCategories(data)
    } catch (error) {
      toast.error('Failed to load categories')
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

  const handleOpenModal = (category = null) => {
    console.log('handleOpenModal called with:', category)
    if (category) {
      console.log('Setting editing category:', category)
      setEditingCategory(category)
      setFormData({
        name: category.name,
        description: category.description || '',
        color: category.color || '#00ffff',
        organization: category.organization?._id || category.organization || '',
        status: category.status,
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: '',
        description: '',
        color: '#00ffff',
        organization: '',
        status: 'active',
      })
    }
    console.log('Opening modal, isModalOpen will be set to true')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
    setFormData({
      name: '',
      description: '',
      color: '#00ffff',
      organization: '',
      status: 'active',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const submitData = { ...formData }
      if (!submitData.organization) {
        delete submitData.organization // null = global category
      }
      
      if (editingCategory) {
        const categoryId = editingCategory._id || editingCategory.id
        if (!categoryId) {
          toast.error('Invalid category ID')
          console.error('No category ID found:', editingCategory)
          return
        }
        console.log('Updating category:', categoryId, submitData)
        await categoriesAPI.update(categoryId, submitData)
        toast.success('Category updated successfully!')
      } else {
        await categoriesAPI.create(submitData)
        toast.success('Category created successfully!')
      }
      handleCloseModal()
      loadCategories()
    } catch (error) {
      console.error('Error saving category:', error)
      toast.error(error.message || 'Failed to save category')
    }
  }

  const handleDelete = async (categoryId) => {
    console.log('handleDelete called with ID:', categoryId)
    if (!categoryId) {
      console.error('No category ID provided')
      toast.error('Invalid category ID')
      return
    }
    
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        console.log('Calling API to delete category:', categoryId)
        await categoriesAPI.delete(categoryId)
        console.log('Category deleted successfully')
        toast.success('Category deleted successfully!')
        loadCategories()
      } catch (error) {
        console.error('Error deleting category:', error)
        toast.error(error.message || 'Failed to delete category')
      }
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-cyber font-bold neon-text uppercase tracking-wider mb-2">Categories</h1>
            <p className="text-cyber-neon-cyan/70 font-mono uppercase tracking-widest text-sm">Manage Ticket Categories</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="btn-primary">
            <Plus size={20} className="mr-2" />
            Add Category
          </Button>
        </div>

        <Card className="p-6">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin text-cyber-neon-cyan text-4xl mb-4">⟳</div>
                <p className="text-cyber-neon-cyan/70 font-mono">Loading categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8">
                <Tag className="mx-auto text-cyber-neon-cyan/50 mb-4" size={48} />
                <p className="text-cyber-neon-cyan/70 font-mono">No categories found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <div
                    key={category._id || category.id}
                    className="card p-6 border-2 border-cyber-neon-cyan/30 hover:border-cyber-neon-cyan/50 transition-all duration-300 cyber-3d"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="p-3 rounded-lg border-2"
                          style={{ 
                            backgroundColor: `${category.color}20`,
                            borderColor: `${category.color}50`
                          }}
                        >
                          <Tag 
                            size={24} 
                            style={{ color: category.color }}
                          />
                        </div>
                        <div>
                          <h3 className="text-lg font-cyber font-bold text-cyber-neon-cyan neon-text">{category.name}</h3>
                          {category.organization && (
                            <p className="text-sm text-cyber-neon-cyan/70 font-mono">
                              {category.organization.name || 'Organization'}
                            </p>
                          )}
                          {!category.organization && (
                            <p className="text-sm text-cyber-neon-cyan/70 font-mono">Global</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={category.status === 'active' ? 'success' : 'warning'}>
                        {category.status}
                      </Badge>
                    </div>

                    {category.description && (
                      <p className="text-sm text-cyber-neon-cyan/80 font-mono mb-4 line-clamp-2">{category.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t-2 border-cyber-neon-cyan/20">
                      <p className="text-xs text-cyber-neon-cyan/50 font-mono">
                        {format(new Date(category.createdAt), 'MMM dd, yyyy')}
                      </p>
                      <div 
                        className="flex items-center space-x-2"
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
                            console.log('Edit button clicked for category:', category)
                            handleOpenModal(category)
                          }}
                          className="text-cyber-neon-cyan hover:text-cyber-neon-cyan transition-colors p-2 rounded hover:bg-cyber-neon-cyan/10 cursor-pointer"
                          title="Edit Category"
                          style={{ 
                            pointerEvents: 'auto',
                            position: 'relative',
                            zIndex: 1001
                          }}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            console.log('Delete button clicked for category:', category)
                            const categoryId = category._id || category.id
                            console.log('Category ID:', categoryId)
                            if (categoryId) {
                              handleDelete(categoryId)
                            } else {
                              console.error('Invalid category ID:', category)
                              toast.error('Invalid category ID')
                            }
                          }}
                          className="text-red-400 hover:text-red-300 transition-colors p-2 rounded hover:bg-red-400/10 cursor-pointer"
                          title="Delete Category"
                          style={{ 
                            pointerEvents: 'auto',
                            position: 'relative',
                            zIndex: 1001
                          }}
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
          title={editingCategory ? 'Edit Category' : 'Add New Category'}
          footer={
            <>
              <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
              <Button onClick={handleSubmit}>Save</Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Category Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., IT Support"
            />
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Category description"
            />
            <div>
              <label className="block text-sm font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest mb-2">
                Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-10 rounded border-2 border-cyber-neon-cyan/50 bg-cyber-darker cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#00ffff"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest mb-2">
                Organization (Leave empty for global)
              </label>
              <select
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                className="w-full px-4 py-3 bg-cyber-darker/50 border-2 border-cyber-neon-cyan/30 rounded-lg text-cyber-neon-cyan focus:outline-none focus:border-cyber-neon-cyan focus:ring-2 focus:ring-cyber-neon-cyan/50 font-mono"
              >
                <option value="">Global (All Organizations)</option>
                {organizations.map(org => (
                  <option key={org._id || org.id} value={org._id || org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 bg-cyber-darker/50 border-2 border-cyber-neon-cyan/30 rounded-lg text-cyber-neon-cyan focus:outline-none focus:border-cyber-neon-cyan focus:ring-2 focus:ring-cyber-neon-cyan/50 font-mono"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}

