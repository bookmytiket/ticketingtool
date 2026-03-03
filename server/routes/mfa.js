import express from 'express'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import jwt from 'jsonwebtoken'
import supabase from '../config/supabase.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// @route   GET /api/mfa/setup
// @desc    Generate MFA secret and QR code
// @access  Private
router.get('/setup', protect, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single()

    if (error || !user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${user.email} (Ticketing Tool)`,
      issuer: 'Ticketing Tool',
    })

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

    // Store secret temporarily (don't enable MFA yet)
    const { error: updateError } = await supabase
      .from('users')
      .update({ mfa_secret: secret.base32 })
      .eq('id', user.id)

    if (updateError) throw updateError

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/mfa/verify
// @desc    Verify MFA code and enable MFA
// @access  Private
router.post('/verify', protect, async (req, res) => {
  try {
    const { token } = req.body

    if (!token || token.length !== 6) {
      return res.status(400).json({ message: 'Invalid verification code' })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, mfa_secret')
      .eq('id', req.user.id)
      .single()

    if (error || !user || !user.mfa_secret) {
      return res.status(400).json({ message: 'MFA setup not initiated. Please start setup first.' })
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: token,
      window: 2, // Allow 2 time steps (60 seconds) before/after
    })

    if (!verified) {
      return res.status(400).json({ message: 'Invalid verification code' })
    }

    // Enable MFA
    const { error: enableError } = await supabase
      .from('users')
      .update({ mfa_enabled: true })
      .eq('id', user.id)

    if (enableError) throw enableError

    res.json({
      message: 'MFA enabled successfully',
      mfaEnabled: true,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/mfa/disable
// @desc    Disable MFA for user
// @access  Private
router.post('/disable', protect, async (req, res) => {
  try {
    const { error: disableError } = await supabase
      .from('users')
      .update({ mfa_enabled: false, mfa_secret: null })
      .eq('id', req.user.id)

    if (disableError) throw disableError

    res.json({
      message: 'MFA disabled successfully',
      mfaEnabled: false,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/mfa/verify-login
// @desc    Verify MFA code during login and return full token
// @access  Public (but requires valid tempToken)
router.post('/verify-login', async (req, res) => {
  try {
    const { tempToken, code } = req.body

    if (!tempToken) {
      return res.status(401).json({ message: 'Temporary token required' })
    }

    if (!code || code.length !== 6) {
      return res.status(400).json({ message: 'Invalid verification code' })
    }

    // Verify tempToken
    let decoded
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'your-secret-key')
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired session. Please login again.' })
    }

    if (!decoded.mfaRequired || !decoded.id) {
      return res.status(400).json({ message: 'Invalid token for MFA verification' })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single()

    if (error || !user || !user.mfa_enabled || !user.mfa_secret) {
      return res.status(400).json({ message: 'MFA is not enabled for this account' })
    }

    // Verify MFA code
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time steps (60 seconds) before/after
    })

    if (!verified) {
      return res.status(400).json({ message: 'Invalid verification code' })
    }

    // Generate full JWT token
    const fullToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    )

    res.json({
      message: 'MFA verification successful',
      token: fullToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mfaEnabled: user.mfa_enabled,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

