import express from 'express'
import supabase from '../config/supabase.js'
import { protect, admin } from '../middleware/auth.js'
import bcrypt from 'bcryptjs'

const router = express.Router()

// @route   GET /api/users/mentions
// @desc    Get users for mentions (same organization)
// @access  Private
router.get('/mentions', protect, async (req, res) => {
  try {
    let query = supabase
      .from('users')
      .select('id, name, email')
      .eq('status', 'active')

    // Users can only mention users from their organization
    if (req.user.organization_id) {
      query = query.eq('organization_id', req.user.organization_id)
    }

    const { data: users, error } = await query.order('name', { ascending: true })
    if (error) throw error
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/users
// @desc    Get all users
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { organization } = req.query
    let query = supabase
      .from('users')
      .select('*, organization:organizations(name), department:departments(name)')

    if (req.user.role === 'admin') {
      if (organization) {
        query = query.eq('organization_id', organization)
      }
    } else if (req.user.role === 'technician') {
      if (req.user.organization_id) {
        query = query.eq('organization_id', req.user.organization_id)
      } else {
        return res.json([])
      }
    } else {
      return res.status(403).json({ message: 'Access denied' })
    }

    const { data: users, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, organization:organizations(name), department:departments(name)')
      .eq('id', req.params.id)
      .single()

    if (error || !user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/users
// @desc    Create new user
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, email, password, role, status, organization_id, department_id } = req.body

    if (!password) {
      return res.status(400).json({ message: 'Password is required' })
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        password: hashedPassword,
        role: role || 'user',
        status: status || 'active',
        organization_id: organization_id || req.user.organization_id,
        department_id: department_id || null,
      }])
      .select('*, organization:organizations(name), department:departments(name)')
      .single()

    if (error) throw error

    // Send welcome email (Async)
    if (user.email) {
      import('../services/emailService.js').then(({ sendEmail }) => {
        const subject = 'Welcome to Ticketing Tool'
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">Welcome to Ticketing Tool!</h2>
            <p>Hello ${user.name},</p>
            <p>Your account has been created successfully.</p>
            <p>Role: ${user.role}</p>
            <p>Organization: ${user.organization?.name || 'N/A'}</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/login">Login to Ticketing Tool</a></p>
          </div>
        `
        sendEmail(user.email, subject, html).catch(console.error)
      })
    }

    res.status(201).json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, email, role, status, password, organization_id, department_id } = req.body
    const updates = {}

    if (name) updates.name = name
    if (email) updates.email = email
    if (role) updates.role = role
    if (status) updates.status = status
    if (organization_id) updates.organization_id = organization_id
    if (department_id !== undefined) updates.department_id = department_id

    if (password) {
      const salt = await bcrypt.genSalt(10)
      updates.password = await bcrypt.hash(password, salt)
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, organization:organizations(name), department:departments(name)')
      .single()

    if (error) throw error
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

