import mongoose from 'mongoose'

const slaPolicySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null, // null means global/default policy
  },
  priority: {
    type: String,
    enum: ['urgent', 'high', 'medium', 'low'],
    required: true,
  },
  responseTime: {
    type: Number, // in hours
    required: true,
    min: 0,
  },
  resolutionTime: {
    type: Number, // in hours
    required: true,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  description: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
})

// Ensure one policy per priority per organization (or global)
slaPolicySchema.index({ organization: 1, priority: 1 }, { unique: true, sparse: true })

export default mongoose.model('SLAPolicy', slaPolicySchema)

