import express from 'express'
import supabase from '../config/supabase.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// @route   GET /api/departments
// @desc    Get all departments
// @access  Private (Admin, Department Head)
router.get('/', protect, async (req, res) => {
  try {
    let query = supabase
      .from('departments')
      .select('*, head:users!head_id(id, name, email), organization:organizations(id, name)')

    // Department heads can only see their own department
    if (req.user.role === 'department-head' && req.user.department_id) {
      query = query.eq('id', req.user.department_id)
    } else if (req.user.role !== 'admin') {
      // Non-admins only see their organization's departments
      if (req.user.organization_id) {
        query = query.eq('organization_id', req.user.organization_id)
      }
    }

    const { data, error } = await query.order('name', { ascending: true })

    if (error) throw error
    res.json(data)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/departments/:id
// @desc    Get department by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const { data: department, error } = await supabase
      .from('departments')
      .select('*, head:users!head_id(id, name, email), organization:organizations(id, name)')
      .eq('id', req.params.id)
      .single()

    if (error || !department) {
      return res.status(404).json({ message: 'Department not found' })
    }

    // Role-based access
    if (req.user.role !== 'admin' && req.user.role !== 'department-head') {
      return res.status(403).json({ message: 'Access denied' })
    }

    if (req.user.role === 'department-head' && req.user.department_id !== department.id) {
      return res.status(403).json({ message: 'Access denied' })
    }

    res.json(department)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/departments
// @desc    Create department
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, head_id, organization_id } = req.body
    const targetOrgId = organization_id || req.user.organization_id

    if (req.user.role !== 'admin' && targetOrgId !== req.user.organization_id) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const { data: existing } = await supabase
      .from('departments')
      .select('id')
      .ilike('name', name)
      .eq('organization_id', targetOrgId)
      .maybeSingle()

    if (existing) {
      return res.status(400).json({ message: 'Department already exists' })
    }

    const { data: department, error } = await supabase
      .from('departments')
      .insert([{
        name,
        description,
        head_id: head_id || null,
        organization_id: targetOrgId
      }])
      .select('*, head:users!head_id(id, name, email), organization:organizations(id, name)')
      .single()

    if (error) throw error

    // Update user role if head assigned
    if (head_id) {
      await supabase
        .from('users')
        .update({ department_id: department.id, role: 'department-head' })
        .eq('id', head_id)
    }

    res.status(201).json(department)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   PUT /api/departments/:id
// @desc    Update department
// @access  Private (Admin only)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, description, head_id, is_active } = req.body
    const { data: department, error: fetchError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !department) {
      return res.status(404).json({ message: 'Department not found' })
    }

    const updates = {}
    if (name) updates.name = name
    if (description !== undefined) updates.description = description
    if (is_active !== undefined) updates.is_active = is_active

    // Handle head_id change
    if (head_id !== undefined && head_id !== department.head_id) {
      // Downgrade old head if they belong to this department
      if (department.head_id) {
        await supabase
          .from('users')
          .update({ role: 'user' }) // Basic downgrade, can be refined
          .eq('id', department.head_id)
      }

      updates.head_id = head_id || null

      if (head_id) {
        await supabase
          .from('users')
          .update({ department_id: department.id, role: 'department-head' })
          .eq('id', head_id)
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('departments')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, head:users!head_id(id, name, email), organization:organizations(id, name)')
      .single()

    if (updateError) throw updateError
    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   DELETE /api/departments/:id
// @desc    Delete department
// @access  Private (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    // Clean up users first
    await supabase
      .from('users')
      .update({ department_id: null, role: 'user' })
      .eq('department_id', req.params.id)

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ message: 'Department deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

