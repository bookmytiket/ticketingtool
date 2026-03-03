// Script to create admin user in MongoDB
// Run this with: node scripts/create-admin-user.js

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '../server/.env') })

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['user', 'agent', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  mfaEnabled: { type: Boolean, default: false },
}, { timestamps: true })

const User = mongoose.model('User', UserSchema)

async function createAdminUser() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27018/ticketing_tool'
    
    // Check for TLS
    const caPath = '/etc/ssl/mongodb/ca.crt'
    let connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
    
    if (fs.existsSync(caPath)) {
      connectionOptions.tls = true
      connectionOptions.tlsCAFile = caPath
      connectionOptions.tlsAllowInvalidCertificates = true
    }

    console.log('Connecting to MongoDB...')
    await mongoose.connect(mongoUri, connectionOptions)
    console.log('Connected to MongoDB!')

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' })
    if (existingAdmin) {
      console.log('Admin user already exists!')
      console.log('Email: admin@example.com')
      console.log('Password: admin123')
      await mongoose.disconnect()
      return
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
    })

    console.log('✅ Admin user created successfully!')
    console.log('Email: admin@example.com')
    console.log('Password: admin123')

    // Create demo users
    const demoUsers = [
      { name: 'Regular User', email: 'user@example.com', password: 'user123', role: 'user' },
      { name: 'Agent User', email: 'agent@example.com', password: 'agent123', role: 'agent' },
    ]

    for (const userData of demoUsers) {
      const existing = await User.findOne({ email: userData.email })
      if (!existing) {
        const hashed = await bcrypt.hash(userData.password, 10)
        await User.create({
          ...userData,
          password: hashed,
          status: 'active',
        })
        console.log(`✅ Created user: ${userData.email}`)
      } else {
        console.log(`ℹ️  User already exists: ${userData.email}`)
      }
    }

    await mongoose.disconnect()
    console.log('Done!')
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

createAdminUser()

