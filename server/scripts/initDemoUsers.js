// Script to initialize demo users
import mongoose from 'mongoose'
import User from '../models/User.js'

const createDemoUsers = async () => {
  try {
    const demoUsers = [
      { name: 'Admin User', email: 'admin@example.com', password: 'admin123', role: 'admin' },
      { name: 'Regular User', email: 'user@example.com', password: 'user123', role: 'user' },
      { name: 'Agent User', email: 'agent@example.com', password: 'agent123', role: 'agent' },
    ]

    for (const userData of demoUsers) {
      const existing = await User.findOne({ email: userData.email })
      if (!existing) {
        await User.create({
          ...userData,
          status: 'active',
        })
        console.log(`✅ Created demo user: ${userData.email} (${userData.role})`)
      } else {
        console.log(`ℹ️  Demo user already exists: ${userData.email}`)
      }
    }
  } catch (error) {
    console.error('Error creating demo users:', error.message)
  }
}

// Export for use in server.js
export default createDemoUsers

