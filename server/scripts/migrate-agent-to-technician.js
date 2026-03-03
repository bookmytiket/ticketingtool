import mongoose from 'mongoose'
import User from '../models/User.js'
import Ticket from '../models/Ticket.js'
import dotenv from 'dotenv'

dotenv.config()

const migrateAgentToTechnician = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketing_tool'
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    // Find all users with "agent" role
    const agentUsers = await User.find({ role: 'agent' })
    console.log(`Found ${agentUsers.length} users with "agent" role`)

    // Update all agent users to technician
    if (agentUsers.length > 0) {
      const result = await User.updateMany(
        { role: 'agent' },
        { $set: { role: 'technician' } }
      )
      console.log(`✅ Updated ${result.modifiedCount} users from "agent" to "technician"`)
    }

    // Find duplicate technicians (same email)
    const duplicateTechnicians = await User.aggregate([
      { $match: { role: 'technician' } },
      { $group: { _id: '$email', count: { $sum: 1 }, ids: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } }
    ])

    console.log(`Found ${duplicateTechnicians.length} duplicate technician emails`)

    // Remove duplicates, keeping the oldest one
    for (const duplicate of duplicateTechnicians) {
      const users = await User.find({ email: duplicate._id, role: 'technician' })
        .sort({ createdAt: 1 }) // Sort by creation date, oldest first
      
      // Keep the first (oldest) user, delete the rest
      const toDelete = users.slice(1)
      
      for (const userToDelete of toDelete) {
        // Update tickets assigned to this user to the first user
        await Ticket.updateMany(
          { assignee: userToDelete._id },
          { $set: { assignee: users[0]._id } }
        )
        
        // Update tickets created by this user to the first user (optional)
        // await Ticket.updateMany(
        //   { creator: userToDelete._id },
        //   { $set: { creator: users[0]._id } }
        // )
        
        // Delete the duplicate user
        await User.findByIdAndDelete(userToDelete._id)
        console.log(`✅ Removed duplicate technician: ${userToDelete.email} (${userToDelete._id})`)
      }
    }

    // Verify final state
    const technicianCount = await User.countDocuments({ role: 'technician' })
    const agentCount = await User.countDocuments({ role: 'agent' })
    
    console.log(`\n✅ Migration complete!`)
    console.log(`   - Technicians: ${technicianCount}`)
    console.log(`   - Agents remaining: ${agentCount}`)

    await mongoose.disconnect()
    console.log('✅ Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

migrateAgentToTechnician()

