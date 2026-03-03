import mongoose from 'mongoose'

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  type: {
    type: String,
    enum: [
      'ticket-created',
      'ticket-updated',
      'ticket-assigned',
      'ticket-resolved',
      'daily-open-tickets',
      'daily-report',
      'weekly-report',
      'monthly-report',
      'custom'
    ],
    required: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  htmlBody: {
    type: String,
    required: true,
  },
  textBody: {
    type: String,
    default: '',
  },
  variables: [{
    type: String,
  }],
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null, // null means global template
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
})

// Ensure one template per type per organization
emailTemplateSchema.index({ type: 1, organization: 1 }, { unique: true, sparse: true })

export default mongoose.model('EmailTemplate', emailTemplateSchema)

