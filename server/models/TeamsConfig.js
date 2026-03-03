import mongoose from 'mongoose'

const teamsConfigSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null, // null means global config
  },
  isEnabled: {
    type: Boolean,
    default: false,
  },
  webhookUrl: {
    type: String,
    trim: true,
    default: null,
  },
  botId: {
    type: String,
    trim: true,
    default: null,
  },
  tenantId: {
    type: String,
    trim: true,
    default: null,
  },
  channelId: {
    type: String,
    trim: true,
    default: null,
  },
  channelName: {
    type: String,
    trim: true,
    default: null,
  },
  notifications: {
    ticketCreated: {
      type: Boolean,
      default: true,
    },
    ticketUpdated: {
      type: Boolean,
      default: true,
    },
    ticketResolved: {
      type: Boolean,
      default: true,
    },
    ticketClosed: {
      type: Boolean,
      default: true,
    },
    slaBreach: {
      type: Boolean,
      default: true,
    },
    ticketAssigned: {
      type: Boolean,
      default: true,
    },
    ticketCommented: {
      type: Boolean,
      default: false,
    },
  },
  workingHours: {
    enabled: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: String, // HH:mm format
      default: '09:00',
    },
    endTime: {
      type: String, // HH:mm format
      default: '17:00',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    daysOfWeek: [{
      type: Number, // 0-6 (Sunday-Saturday)
    }],
  },
  departmentRouting: [{
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    channelId: {
      type: String,
      trim: true,
    },
    channelName: {
      type: String,
      trim: true,
    },
  }],
  lastTested: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
})

// Ensure one config per organization
teamsConfigSchema.index({ organization: 1 }, { unique: true, sparse: true })

export default mongoose.model('TeamsConfig', teamsConfigSchema)

