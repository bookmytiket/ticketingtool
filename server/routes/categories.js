import express from 'express'
import supabase from '../config/supabase.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// @route   GET /api/categories
// @desc    Get all categories (global + organization-specific)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const orgId = req.user.organization_id

    let query = supabase
      .from('categories')
      .select('*')
      .eq('status', 'active')

    // Global categories OR organizational categories
    if (orgId) {
      query = query.or(`organization_id.eq.${orgId},organization_id.is.null`)
    } else {
      query = query.is('organization_id', null)
    }

    const { data: categories, error } = await query.order('name', { ascending: true })
    if (error) throw error
    res.json(categories)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/categories/all
// @desc    Get all categories including inactive (admin only)
// @access  Private/Admin
router.get('/all', protect, admin, async (req, res) => {
  try {
    const { organization_id } = req.query
    const orgId = organization_id || req.user.organization_id

    let query = supabase.from('categories').select('*')

    if (orgId) {
      query = query.or(`organization_id.eq.${orgId},organization_id.is.null`)
    } else {
      query = query.is('organization_id', null)
    }

    const { data: categories, error } = await query.order('name', { ascending: true })
    if (error) throw error
    res.json(categories)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/categories/:id
// @desc    Get single category
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !category) {
      return res.status(404).json({ message: 'Category not found' })
    }
    res.json(category)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/categories
// @desc    Create new category
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, description, color, organization_id, status } = req.body
    const targetOrgId = organization_id || null

    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('name', name)
      .filter('organization_id', targetOrgId === null ? 'is' : 'eq', targetOrgId)
      .maybeSingle()

    if (existing) {
      return res.status(400).json({ message: 'Category with this name already exists' })
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert([{
        name,
        description: description || '',
        color: color || '#00ffff',
        organization_id: targetOrgId,
        status: status || 'active',
      }])
      .select('*')
      .single()

    if (error) throw error
    res.status(201).json(category)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { data: category, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !category) {
      return res.status(404).json({ message: 'Category not found' })
    }

    const { name, description, color, status } = req.body
    const updates = {}

    if (name && name !== category.name) {
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('name', name)
        .filter('organization_id', category.organization_id === null ? 'is' : 'eq', category.organization_id)
        .neq('id', category.id)
        .maybeSingle()

      if (existing) {
        return res.status(400).json({ message: 'Category with this name already exists' })
      }
      updates.name = name
    }

    if (description !== undefined) updates.description = description
    if (color) updates.color = color
    if (status) updates.status = status

    const { data: updated, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error) throw error
    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const { data: category, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !category) {
      return res.status(404).json({ message: 'Category not found' })
    }

    // Check if category name is used in any tickets
    const { count, error: countError } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('category', category.name)

    if (countError) throw countError

    if (count > 0) {
      return res.status(400).json({
        message: `Cannot delete category. It is used in ${count} ticket(s).`
      })
    }

    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id)

    if (deleteError) throw deleteError
    res.json({ message: 'Category deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

