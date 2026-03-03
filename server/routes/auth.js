import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import supabase from '../config/supabase.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d',
  })
}

// @route   POST /api/auth/login
// @desc    Authenticate user & get token (or tempToken if MFA enabled)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const { data: user, error } = await supabase
      .from('users')
      .select('*, organization:organizations(id, name, domain)')
      .eq('email', email)
      .single()

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (user.status !== 'active') {
      return res.status(401).json({ message: 'Account is inactive' })
    }

    if (user.password && !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // If MFA is enabled, return temporary token for MFA verification
    if (user.mfa_enabled) {
      // Generate temporary token (expires in 5 minutes)
      const tempToken = jwt.sign(
        { id: user.id, mfaRequired: true },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '5m' }
      )

      return res.json({
        tempToken,
        mfaRequired: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mfaEnabled: true,
        },
      })
    }

    // If MFA is not enabled, return full token
    res.json({
      token: generateToken(user.id),
      mfaRequired: false,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mfaEnabled: false,
        organization: user.organization,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      mfaEnabled: req.user.mfa_enabled,
      status: req.user.status,
      organization: req.user.organization,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/auth/register
// @desc    Register new user (Admin only)
// @access  Private/Admin
router.post('/register', protect, admin, async (req, res) => {
  try {
    const { name, email, password, role, organization_id } = req.body

    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const { data: user, error } = await supabase
      .from('users')
      .insert([
        {
          name,
          email,
          password: hashedPassword,
          role: role || 'user',
          organization_id
        }
      ])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({
      token: generateToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/auth/create-demo-users
// @desc    Create demo users (admin, user, agent)
// @access  Public (for initial setup)
router.post('/create-demo-users', async (req, res) => {
  try {
    const { organization_id } = req.body

    if (!organization_id) {
      return res.status(400).json({ message: 'organization_id is required' })
    }

    const demoUsers = [
      { name: 'Admin User', email: 'admin@example.com', password: 'admin123', role: 'admin' },
      { name: 'Regular User', email: 'user@example.com', password: 'user123', role: 'user' },
      { name: 'Agent User', email: 'agent@example.com', password: 'agent123', role: 'agent' },
    ]

    const createdUsers = []
    const alreadyExists = []

    for (const userData of demoUsers) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single()

      if (existing) {
        alreadyExists.push(userData.email)
      } else {
        const hashedPassword = await bcrypt.hash(userData.password, 10)
        const { data: user, error } = await supabase
          .from('users')
          .insert([
            {
              name: userData.name,
              email: userData.email,
              password: hashedPassword,
              role: userData.role,
              organization_id,
              status: 'active',
            }
          ])
          .select()
          .single()

        if (!error) {
          createdUsers.push({
            email: user.email,
            role: user.role,
          })
        }
      }
    }

    res.status(200).json({
      message: 'Demo users processed',
      created: createdUsers,
      alreadyExists: alreadyExists,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

