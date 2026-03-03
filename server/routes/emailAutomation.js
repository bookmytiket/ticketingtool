/**
 * Email Automation Management Routes
 * Admin Only
 */

import express from 'express'
import supabase from '../config/supabase.js'
import { protect, admin } from '../middleware/auth.js'
import { runAutomationManually } from '../workers/emailAutomationWorker.js'

const router = express.Router()

// All routes require admin access
router.use(protect, admin)

/**
 * @route   GET /api/email-automation
 * @desc    Get all email automations
 * @access  Private/Admin
 */
router.get('/', async (req, res) => {
  try {
    const { organization } = req.query
    let query = supabase
      .from('email_automations')
      .select('*, organization:organizations(name), emailTemplate:email_templates(name), createdBy:users!created_by_id(name, email)')

    if (organization) {
      query = query.eq('organization_id', organization)
    } else {
      query = query.is('organization_id', null)
    }

    const { data: automations, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    res.json(automations)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/email-automation/:id
 * @desc    Get email automation by ID
 * @access  Private/Admin
 */
router.get('/:id', async (req, res) => {
  try {
    const { data: automation, error } = await supabase
      .from('email_automations')
      .select('*, organization:organizations(name), emailTemplate:email_templates(name, subject), createdBy:users!created_by_id(name, email)')
      .eq('id', req.params.id)
      .single()

    if (error || !automation) {
      return res.status(404).json({ message: 'Automation not found' })
    }

    res.json(automation)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/email-automation
 * @desc    Create email automation
 * @access  Private/Admin
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      type,
      organization,
      isEnabled,
      schedule,
      recipients,
      reportFormat,
      emailTemplate,
    } = req.body

    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' })
    }

    const automationData = {
      name,
      type,
      organization_id: organization || null,
      is_enabled: isEnabled !== undefined ? isEnabled : true,
      schedule: schedule || {
        time: '09:00',
        timezone: 'UTC',
        dayOfWeek: type === 'weekly-report' ? 1 : null, // Monday
        dayOfMonth: type === 'monthly-report' ? 1 : null, // 1st of month
      },
      recipients: recipients || {
        admins: true,
        organizationManagers: true,
        departmentHeads: true,
        technicians: type === 'daily-open-tickets',
      },
      report_format: reportFormat || ['html'],
      email_template_id: emailTemplate || null,
      created_by_id: req.user.id,
    }

    const { data: automation, error } = await supabase
      .from('email_automations')
      .insert([automationData])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ message: 'Automation with this type and organization already exists' })
      }
      throw error
    }

    res.status(201).json(automation)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   PUT /api/email-automation/:id
 * @desc    Update email automation
 * @access  Private/Admin
 */
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      isEnabled,
      schedule,
      recipients,
      reportFormat,
      emailTemplate,
    } = req.body

    const { data: automation, error: fetchError } = await supabase
      .from('email_automations')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !automation) {
      return res.status(404).json({ message: 'Automation not found' })
    }

    const updates = {}
    if (name) updates.name = name
    if (isEnabled !== undefined) updates.is_enabled = isEnabled
    if (schedule) updates.schedule = { ...automation.schedule, ...schedule }
    if (recipients) updates.recipients = { ...automation.recipients, ...recipients }
    if (reportFormat) updates.report_format = reportFormat
    if (emailTemplate !== undefined) updates.email_template_id = emailTemplate

    const { data: updated, error: updateError } = await supabase
      .from('email_automations')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (updateError) throw updateError

    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   DELETE /api/email-automation/:id
 * @desc    Delete email automation
 * @access  Private/Admin
 */
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('email_automations')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error

    res.json({ message: 'Automation deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/email-automation/:id/run
 * @desc    Run automation manually (for testing)
 * @access  Private/Admin
 */
router.post('/:id/run', async (req, res) => {
  try {
    const result = await runAutomationManually(req.params.id)
    res.json({ success: true, result })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

