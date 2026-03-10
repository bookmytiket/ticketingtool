/**
 * FAQ Management
 * Admin Only - Manage frequently asked questions
 */

import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { faqAPI, organizationsAPI, departmentsAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { HelpCircle, Plus, Edit, Trash2, Search } from 'lucide-react'

export const FAQ = () => {
  const { user } = useAuth()
  const [faqs, setFaqs] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingFAQ, setEditingFAQ] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    keywords: '',
    category: 'general',
    organization: '',
    department: '',
    priority: 0,
  })

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const [faqsData, orgsData, deptsData] = await Promise.all([
        faqAPI.getAll(),
        organizationsAPI.getAll(),
        departmentsAPI.getAll(),
      ])
      setFaqs(faqsData)
      setOrganizations(orgsData)
      setDepartments(deptsData)
    } catch (error) {
      console.error('Failed to load data', error)
      toast.error('Failed to load FAQs')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingFAQ(null)
    setFormData({
      question: '',
      answer: '',
      keywords: '',
      category: 'general',
      organization: '',
      department: '',
      priority: 0,
    })
    setShowCreateModal(true)
  }

  const handleEdit = (faq) => {
    setEditingFAQ(faq)
    setFormData({
      question: faq.question,
      answer: faq.answer,
      keywords: (faq.keywords || []).join(', '),
      category: faq.category,
      organization: faq.organization?._id || faq.organization || '',
      department: faq.department?._id || faq.department || '',
      priority: faq.priority || 0,
    })
    setShowCreateModal(true)
  }

  const handleSubmit = async () => {
    try {
      if (!formData.question || !formData.answer) {
        toast.error('Question and answer are required')
        return
      }

      const faqData = {
        ...formData,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
        organization: formData.organization || null,
        department: formData.department || null,
      }

      if (editingFAQ) {
        await faqAPI.update(editingFAQ._id, faqData)
        toast.success('FAQ updated successfully')
      } else {
        await faqAPI.create(faqData)
        toast.success('FAQ created successfully')
      }

      setShowCreateModal(false)
      loadData()
    } catch (error) {
      console.error('Failed to save FAQ', error)
      toast.error(error.message || 'Failed to save FAQ')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) {
      return
    }

    try {
      await faqAPI.delete(id)
      toast.success('FAQ deleted successfully')
      loadData()
    } catch (error) {
      console.error('Failed to delete FAQ', error)
      toast.error('Failed to delete FAQ')
    }
  }

  const filteredFAQs = faqs.filter(faq => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      faq.question.toLowerCase().includes(search) ||
      faq.answer.toLowerCase().includes(search) ||
      (faq.keywords || []).some(k => k.toLowerCase().includes(search))
    )
  })

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
              FAQ Management
            </h1>
            <p className="text-sm text-gray-600">Manage frequently asked questions for the chatbot</p>
          </div>
          <Button
            transparent
            onClick={handleCreate}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Create FAQ
          </Button>
        </div>

        {/* Search */}
        <Card>
          <div className="flex items-center gap-2">
            <Search className="text-gray-400" size={20} />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search FAQs..."
              className="flex-1"
            />
          </div>
        </Card>

        {/* FAQs List */}
        <Card>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
              <p className="text-gray-600">Loading FAQs...</p>
            </div>
          ) : filteredFAQs.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">No FAQs found. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFAQs.map((faq) => (
                <div
                  key={faq._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                          {faq.category}
                        </span>
                        {faq.priority > 0 && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                            Priority {faq.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{faq.answer}</p>
                      {faq.keywords && faq.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {faq.keywords.map((keyword, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {faq.organization?.name || 'Global'} • 
                        Views: {faq.viewCount || 0} • 
                        Helpful: {faq.helpfulCount || 0}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        transparent
                        onClick={() => handleEdit(faq)}
                        className="text-primary-600 hover:text-primary-700"
                        type="button"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        transparent
                        onClick={() => handleDelete(faq._id)}
                        className="text-red-600 hover:text-red-700"
                        type="button"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Create/Edit Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={editingFAQ ? 'Edit FAQ' : 'Create FAQ'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Question</label>
              <Input
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="e.g., How do I reset my password?"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Answer</label>
              <textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Provide a detailed answer..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Keywords (comma-separated)</label>
              <Input
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="password, reset, login, account"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                options={[
                  { value: 'general', label: 'General' },
                  { value: 'password', label: 'Password' },
                  { value: 'vpn', label: 'VPN' },
                  { value: 'email', label: 'Email' },
                  { value: 'hr', label: 'HR' },
                  { value: 'it', label: 'IT Support' },
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Department (Optional)</label>
              <Select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                options={[
                  { value: '', label: 'All Departments' },
                  ...departments.map(dept => ({
                    value: dept._id || dept.id,
                    label: dept.name,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Priority (0-10, higher = matched first)</label>
              <Input
                type="number"
                min="0"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
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
                {editingFAQ ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}

