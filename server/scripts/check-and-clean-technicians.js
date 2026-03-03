// Script to check for remaining agent roles and remove duplicate technicians
import mongoose from 'mongoose'
import User from '../models/User.js'
import Ticket from '../models/Ticket.js'
import dotenv from 'dotenv'

dotenv.config()

const checkAndClean = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketing_tool'
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB\n')

    // Check for any remaining agent roles
    const agentUsers = await User.find({ role: 'agent' })
    console.log(`📊 Checking for remaining "agent" roles...`)
    console.log(`   Found ${agentUsers.length} users with "agent" role`)
    
    if (agentUsers.length > 0) {
      console.log(`\n⚠️  Converting ${agentUsers.length} agent users to technician...`)
      const result = await User.updateMany(
        { role: 'agent' },
        { $set: { role: 'technician' } }
      )
      console.log(`   ✅ Updated ${result.modifiedCount} users from "agent" to "technician"`)
    } else {
      console.log(`   ✅ No agent roles found - all good!\n`)
    }

    // Find all technicians
    const allTechnicians = await User.find({ role: 'technician' })
    console.log(`\n📊 Total technicians found: ${allTechnicians.length}`)

    // Find duplicate technicians by email
    const duplicateTechnicians = await User.aggregate([
      { $match: { role: 'technician' } },
      { $group: { 
          _id: '$email', 
          count: { $sum: 1 }, 
          ids: { $push: '$_id' },
          names: { $push: '$name' },
          created: { $push: '$createdAt' }
        } 
      },
      { $match: { count: { $gt: 1 } } }
    ])

    console.log(`\n📊 Checking for duplicate technicians...`)
    console.log(`   Found ${duplicateTechnicians.length} duplicate technician emails\n`)

    if (duplicateTechnicians.length > 0) {
      let totalDeleted = 0
      let totalTicketsUpdated = 0

      for (const duplicate of duplicateTechnicians) {
        console.log(`\n🔍 Processing duplicate: ${duplicate._id}`)
        console.log(`   Found ${duplicate.count} entries`)
        
        // Get all users with this email, sorted by creation date (oldest first)
        const users = await User.find({ 
          email: duplicate._id, 
          role: 'technician' 
        }).sort({ createdAt: 1 })
        
        console.log(`   Users:`)
        users.forEach((u, idx) => {
          console.log(`     ${idx + 1}. ${u.name} (ID: ${u._id}) - Created: ${u.createdAt}`)
        })
        
        // Keep the first (oldest) user, delete the rest
        const keeper = users[0]
        const toDelete = users.slice(1)
        
        console.log(`   ✅ Keeping: ${keeper.name} (${keeper._id})`)
        
        for (const userToDelete of toDelete) {
          // Update tickets assigned to this user to the keeper
          const ticketsUpdated = await Ticket.updateMany(
            { assignee: userToDelete._id },
            { $set: { assignee: keeper._id } }
          )
          
          if (ticketsUpdated.modifiedCount > 0) {
            console.log(`   📝 Updated ${ticketsUpdated.modifiedCount} tickets assigned to ${userToDelete.name}`)
            totalTicketsUpdated += ticketsUpdated.modifiedCount
          }
          
          // Update tickets created by this user to the keeper (optional - commented out)
          // const createdTicketsUpdated = await Ticket.updateMany(
          //   { creator: userToDelete._id },
          //   { $set: { creator: keeper._id } }
          // )
          
          // Delete the duplicate user
          await User.findByIdAndDelete(userToDelete._id)
          console.log(`   🗑️  Deleted duplicate: ${userToDelete.name} (${userToDelete._id})`)
          totalDeleted++
        }
      }

      console.log(`\n✅ Cleanup Summary:`)
      console.log(`   - Duplicate technicians removed: ${totalDeleted}`)
      console.log(`   - Tickets reassigned: ${totalTicketsUpdated}`)
    } else {
      console.log(`   ✅ No duplicate technicians found - all good!`)
    }

    // Final verification
    console.log(`\n📊 Final Status:`)
    const finalTechnicianCount = await User.countDocuments({ role: 'technician' })
    const finalAgentCount = await User.countDocuments({ role: 'agent' })
    const finalDuplicateCount = await User.aggregate([
      { $match: { role: 'technician' } },
      { $group: { _id: '$email', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'duplicates' }
    ])
    
    console.log(`   - Technicians: ${finalTechnicianCount}`)
    console.log(`   - Agents remaining: ${finalAgentCount}`)
    console.log(`   - Duplicate emails: ${finalDuplicateCount[0]?.duplicates || 0}`)

    // List all technicians
    const allTechs = await User.find({ role: 'technician' })
      .select('name email createdAt')
      .sort({ createdAt: 1 })
    
    console.log(`\n📋 All Technicians (${allTechs.length}):`)
    allTechs.forEach((tech, idx) => {
      console.log(`   ${idx + 1}. ${tech.name} (${tech.email}) - Created: ${tech.createdAt}`)
    })

    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

checkAndClean()

