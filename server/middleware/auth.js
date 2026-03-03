import jwt from 'jsonwebtoken'
import supabase from '../config/supabase.js'

export const protect = async (req, res, next) => {
  try {
    let token

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')

      const { data: user, error } = await supabase
        .from('users')
        .select('*, organization:organizations(id, name, domain)')
        .eq('id', decoded.id)
        .single()

      if (error || !user) {
        return res.status(401).json({ message: 'User not found' })
      }

      // Rename properties to match expected format if needed
      req.user = user
      next()
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next()
  } else {
    res.status(403).json({ message: 'Not authorized as admin' })
  }
}

