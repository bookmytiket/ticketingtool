import mongoose from 'mongoose'
import Logo from '../models/Logo.js'
import dotenv from 'dotenv'

dotenv.config()

const deleteDemoLogos = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongoadmin:mongopassword@mongodb:27017/ticketing_tool?authSource=admin')
    const result = await Logo.deleteMany({})
    console.log(`✅ Deleted ${result.deletedCount} demo logo(s) from database`)
    process.exit(0)
  } catch (error) {
    console.error('❌ Error deleting logos:', error)
    process.exit(1)
  }
}

deleteDemoLogos()

