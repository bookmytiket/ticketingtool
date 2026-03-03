import mongoose from 'mongoose'

const emailAutomationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['daily-open-tickets', 'daily-report', 'weekly-report', 'monthly-report'],
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null, // null means global automation
  },
  isEnabled: {
    type: Boolean,
    default: true,
  },
  schedule: {
    time: {
      type: String, // HH:mm format (e.g., "09:00", "00:00")
      required: true,
      default: '09:00',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    dayOfWeek: {
      type: Number, // 0-6 (Sunday-Saturday), only for weekly
      default: null,
    },
    dayOfMonth: {
      type: Number, // 1-31, only for monthly
      default: null,
    },
  },
  recipients: {
    admins: {
      type: Boolean,
      default: true,
    },
    organizationManagers: {
      type: Boolean,
      default: true,
    },
    departmentHeads: {
      type: Boolean,
      default: true,
    },
    technicians: {
      type: Boolean,
      default: false, // Only for daily open tickets
    },
  },
  reportFormat: {
    type: [String],
    enum: ['html', 'csv', 'pdf'],
    default: ['html'],
  },
  emailTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate',
    default: null,
  },
  lastSent: {
    type: Date,
    default: null,
  },
  nextRun: {
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

// Ensure one automation per type per organization
emailAutomationSchema.index({ type: 1, organization: 1 }, { unique: true, sparse: true })

export default mongoose.model('EmailAutomation', emailAutomationSchema)

