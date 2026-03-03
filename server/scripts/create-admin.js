// Script to create admin user in Supabase
import supabase from '../config/supabase.js'
import bcrypt from 'bcryptjs'

async function createUsers() {
  try {
    console.log('🚀 Creating demo users in Supabase...')

    const salt = await bcrypt.genSalt(10)
    const adminHashedPassword = await bcrypt.hash('admin123', salt)
    const userHashedPassword = await bcrypt.hash('user123', salt)
    const agentHashedPassword = await bcrypt.hash('agent123', salt)

    const users = [
      { name: 'Admin User', email: 'admin@example.com', password: adminHashedPassword, role: 'admin' },
      { name: 'Regular User', email: 'user@example.com', password: userHashedPassword, role: 'user' },
      { name: 'Agent User', email: 'agent@example.com', password: agentHashedPassword, role: 'technician' },
    ]

    for (const userData of users) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .maybeSingle()

      if (!existingUser) {
        const { error } = await supabase
          .from('users')
          .insert([{
            ...userData,
            status: 'active',
          }])

        if (error) {
          console.error(`❌ Error creating user ${userData.email}:`, error.message)
        } else {
          console.log(`✅ User created: ${userData.email} (${userData.role})`)
        }
      } else {
        console.log(`ℹ️  User already exists: ${userData.email}`)
      }
    }

    console.log('\n✅ Demo users initialization complete!')
    process.exit(0)
  } catch (error) {
    console.error('Error in create-admin script:', error.message)
    process.exit(1)
  }
}

createUsers()

