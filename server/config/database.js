import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

import fs from 'fs'

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketing_tool'
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
    
    // Enable TLS only if explicitly requested in connection string or env var
    if (mongoUri.includes('tls=true') || process.env.MONGODB_TLS === 'true') {
      const caPath = process.env.MONGODB_CA_FILE || '/etc/ssl/mongodb/ca.crt'
      if (fs.existsSync(caPath)) {
        options.tls = true
        options.tlsCAFile = caPath
        options.tlsAllowInvalidCertificates = true
        console.log('MongoDB TLS enabled')
      }
    }

    const conn = await mongoose.connect(mongoUri, options)
    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

export default connectDB

