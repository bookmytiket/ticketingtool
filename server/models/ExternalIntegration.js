import mongoose from 'mongoose'
import crypto from 'crypto'

const externalIntegrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['webhook', 'api', 'azure-sentinel', 'custom'],
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  config: {
    // Webhook/API configuration
    url: String,
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE'],
      default: 'POST',
    },
    headers: {
      type: Map,
      of: String,
      default: {},
    },
    authType: {
      type: String,
      enum: ['none', 'bearer', 'basic', 'api-key'],
      default: 'none',
    },
    authConfig: {
      // For bearer token
      bearerToken: String,
      // For basic auth
      username: String,
      password: String,
      // For API key
      apiKey: String,
      apiKeyHeader: String,
    },
    // Azure Sentinel specific
    workspaceId: String,
    subscriptionId: String,
    resourceGroup: String,
    // Custom mapping
    fieldMapping: {
      type: Map,
      of: String,
      default: {},
    },
  },
  webhookUrl: {
    type: String,
    unique: true,
    sparse: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lastTriggered: {
    type: Date,
    default: null,
  },
  triggerCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
})

// Generate unique webhook URL
externalIntegrationSchema.pre('save', async function(next) {
  if (this.isNew && (this.type === 'webhook' || this.type === 'azure-sentinel') && !this.webhookUrl) {
    const randomId = crypto.randomBytes(16).toString('hex')
    this.webhookUrl = `/api/integrations/webhook/${randomId}`
  }
  next()
})

// Index for webhook lookups
externalIntegrationSchema.index({ webhookUrl: 1 })
externalIntegrationSchema.index({ type: 1, isActive: 1 })

export default mongoose.model('ExternalIntegration', externalIntegrationSchema)

