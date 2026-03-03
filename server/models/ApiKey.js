import mongoose from 'mongoose'
import crypto from 'crypto'

const apiKeySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  keyHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null,
  },
  permissions: {
    type: [String],
    enum: ['read', 'write', 'admin'],
    default: ['read'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastUsed: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  rateLimit: {
    type: Number,
    default: 1000, // requests per hour
  },
  rateLimitWindow: {
    type: Number,
    default: 3600000, // 1 hour in milliseconds
  },
}, {
  timestamps: true,
})

// Generate API key
apiKeySchema.statics.generateKey = function() {
  return `tk_${crypto.randomBytes(32).toString('hex')}`
}

// Hash API key for storage
apiKeySchema.statics.hashKey = function(key) {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// Verify API key
apiKeySchema.statics.verifyKey = async function(key) {
  const keyHash = this.hashKey(key)
  const apiKey = await this.findOne({ keyHash, isActive: true })
  
  if (!apiKey) {
    return null
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null
  }

  // Update last used
  apiKey.lastUsed = new Date()
  apiKey.usageCount += 1
  await apiKey.save()

  return apiKey
}

export default mongoose.model('ApiKey', apiKeySchema)

