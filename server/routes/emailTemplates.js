/**
 * Email Template Management Routes
 * Admin Only
 */

import express from 'express'
import supabase from '../config/supabase.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// All routes require admin access
router.use(protect, admin)

/**
 * @route   GET /api/email-templates
 * @desc    Get all email templates
 * @access  Private/Admin
 */
router.get('/', async (req, res) => {
  try {
    const { organization_id, type } = req.query

    let query = supabase
      .from('email_templates')
      .select('*, organization:organizations(name)')

    if (organization_id) {
      query = query.eq('organization_id', organization_id)
    } else {
      query = query.is('organization_id', null)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data: templates, error } = await query.order('created_at', { ascending: false })
    if (error) throw error

    res.json(templates)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/email-templates/:id
 * @desc    Get email template by ID
 * @access  Private/Admin
 */
router.get('/:id', async (req, res) => {
  try {
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*, organization:organizations(name)')
      .eq('id', req.params.id)
      .single()

    if (error || !template) {
      return res.status(404).json({ message: 'Template not found' })
    }

    res.json(template)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/email-templates
 * @desc    Create email template
 * @access  Private/Admin
 */
router.post('/', async (req, res) => {
  try {
    const { name, type, subject, html_body, text_body, organization_id, variables } = req.body

    if (!name || !type || !subject || !html_body) {
      return res.status(400).json({ message: 'Name, type, subject, and html_body are required' })
    }

    // Check for existing template of same type for the same org
    const { data: existing } = await supabase
      .from('email_templates')
      .select('id')
      .eq('type', type)
      .filter('organization_id', organization_id ? 'eq' : 'is', organization_id || null)
      .maybeSingle()

    if (existing) {
      return res.status(400).json({ message: 'Template with this type and organization already exists' })
    }

    const { data: template, error } = await supabase
      .from('email_templates')
      .insert([{
        name,
        type,
        subject,
        html_body,
        text_body: text_body || '',
        organization_id: organization_id || null,
        variables: variables || [],
      }])
      .select('*')
      .single()

    if (error) throw error
    res.status(201).json(template)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   PUT /api/email-templates/:id
 * @desc    Update email template
 * @access  Private/Admin
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, subject, html_body, text_body, is_active, variables } = req.body

    const updates = {}
    if (name) updates.name = name
    if (subject) updates.subject = subject
    if (html_body) updates.html_body = html_body
    if (text_body !== undefined) updates.text_body = text_body
    if (is_active !== undefined) updates.is_active = is_active
    if (variables) updates.variables = variables

    const { data: template, error } = await supabase
      .from('email_templates')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error || !template) {
      return res.status(404).json({ message: 'Template not found' })
    }

    res.json(template)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   DELETE /api/email-templates/:id
 * @desc    Delete email template
 * @access  Private/Admin
 */
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ message: 'Template deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/email-templates/:id/preview
 * @desc    Preview email template with sample data
 * @access  Private/Admin
 */
router.post('/:id/preview', async (req, res) => {
  try {
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !template) {
      return res.status(404).json({ message: 'Template not found' })
    }

    const sampleData = generateSampleData(template.type)

    let rendered = template.html_body
    Object.keys(sampleData).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      const val = typeof sampleData[key] === 'object' ? JSON.stringify(sampleData[key]) : sampleData[key]
      rendered = rendered.replace(regex, val)
    })

    res.json({ html: rendered, subject: template.subject })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * Generate sample data for template preview
 */
const generateSampleData = (type) => {
  const baseData = {
    date: new Date().toLocaleDateString(),
    period: 'Sample',
  }

  switch (type) {
    case 'daily-open-tickets':
      return {
        ...baseData,
        tickets: [
          { ticketId: 1001, title: 'Sample Ticket 1', priority: 'high', department: { name: 'IT Support' }, assignee: { name: 'John Doe' }, dueDate: new Date(), createdAt: new Date() },
          { ticketId: 1002, title: 'Sample Ticket 2', priority: 'medium', department: { name: 'HR' }, assignee: null, dueDate: null, createdAt: new Date() },
        ],
      }
    case 'daily-report':
      return {
        ...baseData,
        totalCreated: 10,
        totalOpen: 5,
        totalResolved: 3,
        slaBreached: 1,
        departmentSummary: [{ departmentName: 'IT Support', count: 5 }, { departmentName: 'HR', count: 3 }],
      }
    case 'weekly-report':
      return {
        ...baseData,
        startDate: 'Jan 01, 2024',
        endDate: 'Jan 07, 2024',
        totalCreated: 50,
        resolved: 30,
        unresolved: 20,
        slaCompliant: 45,
        slaBreached: 5,
        technicianPerformance: [{ name: 'John Doe', total: 10, resolved: 8 }],
        topIssues: [{ _id: 'Hardware Issue', count: 10 }],
      }
    case 'monthly-report':
      return {
        ...baseData,
        month: 'January 2024',
        totalCreated: 200,
        departmentTrends: [{ departmentName: 'IT Support', count: 100 }],
        slaViolations: 10,
        slaComplianceRate: 95,
        technicianProductivity: [{ name: 'John Doe', total: 50, resolved: 45, resolutionRate: 90 }],
        recurringIssues: [{ _id: 'Hardware Issue', count: 20 }],
      }
    default:
      return baseData
  }
}


export default router
