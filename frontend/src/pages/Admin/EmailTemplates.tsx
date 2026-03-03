import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Plus, Edit, Trash2, Mail, Eye, Save } from 'lucide-react'
import { adminAPI, emailTemplatesAPI } from '../../services/api'
import toast from 'react-hot-toast'

export const EmailTemplates = () => {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    type: 'ticket-created',
    subject: '',
    htmlBody: '',
    textBody: '',
    isActive: true,
  })

  const templateTypes = [
    { value: 'ticket-created', label: 'Ticket Created (Auto Reply)' },
    { value: 'ticket-updated', label: 'Ticket Status Updated' },
    { value: 'ticket-assigned', label: 'Ticket Assigned' },
    { value: 'ticket-resolved', label: 'Ticket Resolved' },
    { value: 'custom', label: 'Custom Template' },
  ]

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const data = await emailTemplatesAPI.getAll()
      setTemplates(data)
    } catch (error) {
      toast.error('Failed to load email templates')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (template = null) => {
    if (template) {
      setEditingTemplate(template)
      setFormData({
        name: template.name || '',
        type: template.type || 'ticket-created',
        subject: template.subject || '',
        htmlBody: template.htmlBody || '',
        textBody: template.textBody || '',
        isActive: template.isActive !== undefined ? template.isActive : true,
      })
    } else {
      setEditingTemplate(null)
      setFormData({
        name: '',
        type: 'ticket-created',
        subject: '',
        htmlBody: getDefaultTemplate('ticket-created'),
        textBody: '',
        isActive: true,
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTemplate(null)
    setFormData({
      name: '',
      type: 'ticket-created',
      subject: '',
      htmlBody: '',
      textBody: '',
      isActive: true,
    })
  }

  const handleTypeChange = (type) => {
    setFormData({
      ...formData,
      type,
      htmlBody: getDefaultTemplate(type),
      subject: getDefaultSubject(type),
    })
  }

  const getDefaultSubject = (type) => {
    const subjects = {
      'ticket-created': 'Ticket #{{ticketId}} Created - {{ticketTitle}}',
      'ticket-updated': 'Ticket #{{ticketId}} Updated - {{ticketTitle}}',
      'ticket-assigned': 'Ticket #{{ticketId}} Assigned to You - {{ticketTitle}}',
      'ticket-resolved': 'Ticket #{{ticketId}} Resolved - {{ticketTitle}}',
      'custom': 'Custom Email Template',
    }
    return subjects[type] || ''
  }

  const getDefaultTemplate = (type) => {
    if (type === 'ticket-created') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; padding: 20px; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header-banner { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px 20px; text-align: center; }
    .header-banner h1 { font-size: 28px; font-weight: 600; margin: 0; }
    .content { padding: 30px 20px; background: #ffffff; }
    .greeting { font-size: 16px; color: #1f2937; margin-bottom: 15px; }
    .ticket-details { background: #f9fafb; padding: 20px; margin: 25px 0; border-radius: 6px; border: 1px solid #e5e7eb; }
    .detail-row { margin-bottom: 12px; font-size: 14px; }
    .detail-label { font-weight: 600; color: #374151; display: inline-block; min-width: 120px; }
    .footer-note { text-align: center; padding: 20px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header-banner">
      <h1>Ticket Created Successfully</h1>
    </div>
    <div class="content">
      <p class="greeting">Dear Customer,</p>
      <p>Thank you for contacting us. We have received your request and created a support ticket for you.</p>
      <div class="ticket-details">
        <h3>Ticket Details:</h3>
        <div class="detail-row">
          <span class="detail-label">Ticket ID:</span>
          <span>#{{ticketId}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Title:</span>
          <span>{{ticketTitle}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Category:</span>
          <span>{{ticketCategory}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Priority:</span>
          <span>{{ticketPriority}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span>{{ticketStatus}}</span>
        </div>
      </div>
      <p>Our support team will review your ticket and respond as soon as possible.</p>
      <p><strong>Best regards,</strong><br>Support Team</p>
    </div>
    <div class="footer-note">
      <p>This is an automated message.</p>
    </div>
  </div>
</body>
</html>`
    } else if (type === 'ticket-updated') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; padding: 20px; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header-banner { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; }
    .header-banner h1 { font-size: 28px; font-weight: 600; margin: 0; }
    .content { padding: 30px 20px; background: #ffffff; }
    .ticket-details { background: #f9fafb; padding: 20px; margin: 25px 0; border-radius: 6px; border: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header-banner">
      <h1>Ticket Updated</h1>
    </div>
    <div class="content">
      <p>Dear Customer,</p>
      <p>Your ticket #{{ticketId}} has been updated.</p>
      <div class="ticket-details">
        <h3>Current Status:</h3>
        <p><strong>Ticket ID:</strong> #{{ticketId}}</p>
        <p><strong>Title:</strong> {{ticketTitle}}</p>
        <p><strong>Status:</strong> {{ticketStatus}}</p>
        <p><strong>Priority:</strong> {{ticketPriority}}</p>
      </div>
      <p><strong>Best regards,</strong><br>Support Team</p>
    </div>
  </div>
</body>
</html>`
    }
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingTemplate) {
        await emailTemplatesAPI.update(editingTemplate._id, formData)
        toast.success('Email template updated successfully!')
      } else {
        await emailTemplatesAPI.create(formData)
        toast.success('Email template created successfully!')
      }
      handleCloseModal()
      loadTemplates()
    } catch (error) {
      toast.error(error.message || 'Failed to save email template')
    }
  }

  const handleDelete = async (templateId) => {
    if (window.confirm('Are you sure you want to delete this email template?')) {
      try {
        await emailTemplatesAPI.delete(templateId)
        toast.success('Email template deleted successfully!')
        loadTemplates()
      } catch (error) {
        toast.error(error.message || 'Failed to delete email template')
      }
    }
  }

  const handlePreview = async () => {
    // Replace template variables with sample data
    let preview = formData.htmlBody
    const sampleData = {
      ticketId: '1006',
      ticketTitle: 'Sample Ticket Title',
      ticketCategory: 'Hardware',
      ticketPriority: 'medium',
      ticketStatus: 'open',
      customerName: 'John Doe',
      assigneeName: 'Support Technician',
    }
    
    Object.keys(sampleData).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      preview = preview.replace(regex, sampleData[key])
    })
    
    setPreviewHtml(preview)
    setIsPreviewOpen(true)
  }

  const getTypeColor = (type) => {
    const colors = {
      'ticket-created': 'info',
      'ticket-updated': 'success',
      'ticket-assigned': 'warning',
      'ticket-resolved': 'success',
      'custom': 'info',
    }
    return colors[type] || 'info'
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
              Email Templates
            </h1>
            <p className="text-sm text-gray-600">Manage auto-reply email templates for ticket creation and updates</p>
          </div>
          <Button transparent onClick={() => handleOpenModal()}>
            <Plus size={20} className="mr-2" />
            Create Template
          </Button>
        </div>

        {/* Templates List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="inline-block animate-spin text-primary-600 text-4xl mb-4">⟳</div>
              <p className="text-gray-600">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">No email templates found</p>
              <p className="text-sm text-gray-500">Create your first template to get started</p>
            </div>
          ) : (
            templates.map((template) => (
              <Card key={template._id} className="p-6 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                      <Badge variant={getTypeColor(template.type)}>
                        {templateTypes.find(t => t.value === template.type)?.label || template.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{template.subject}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={template.isActive ? 'success' : 'warning'}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(template)}
                      className="text-primary-600 hover:text-primary-700 transition-colors p-1"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(template._id)}
                      className="text-red-600 hover:text-red-700 transition-colors p-1"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
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
          title={editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
          size="xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Template Name"
              placeholder="e.g., Ticket Created Auto Reply"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Select
              label="Template Type"
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              options={templateTypes}
              required
            />

            <Input
              label="Email Subject"
              placeholder="e.g., Ticket #{{ticketId}} Created - {{ticketTitle}}"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                HTML Body (Use {'{{variableName}}'} for dynamic content)
              </label>
              <textarea
                value={formData.htmlBody}
                onChange={(e) => setFormData({ ...formData, htmlBody: e.target.value })}
                className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter HTML template..."
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Available variables: {'{{ticketId}}'}, {'{{ticketTitle}}'}, {'{{ticketCategory}}'}, {'{{ticketPriority}}'}, {'{{ticketStatus}}'}, {'{{customerName}}'}, {'{{assigneeName}}'}
              </p>
            </div>

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
                onClick={handlePreview}
                className="flex-1"
              >
                <Eye size={20} className="mr-2" />
                Preview
              </Button>
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
                <Save size={20} className="mr-2" />
                {editingTemplate ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Preview Modal */}
        <Modal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          title="Email Template Preview"
          size="xl"
        >
          <div className="border rounded-lg overflow-hidden">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[600px] border-0"
              title="Email Preview"
            />
          </div>
        </Modal>
      </div>
    </Layout>
  )
}

