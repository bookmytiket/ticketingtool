import mongoose from 'mongoose'

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  answer: {
    type: String,
    required: true,
  },
  keywords: [{
    type: String,
    trim: true,
  }],
  category: {
    type: String,
    enum: ['password', 'vpn', 'email', 'hr', 'it', 'general'],
    default: 'general',
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null, // null means global FAQ
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  priority: {
    type: Number,
    default: 0, // Higher priority FAQs are matched first
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  helpfulCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
})

// Index for search
faqSchema.index({ question: 'text', keywords: 'text' })
faqSchema.index({ organization: 1, isActive: 1 })
faqSchema.index({ category: 1, isActive: 1 })

export default mongoose.model('FAQ', faqSchema)

