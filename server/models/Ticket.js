import mongoose from 'mongoose'

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: Number,
    unique: true,
    required: false, // Auto-generated in pre-save hook
    default: null, // Will be set in pre-save hook
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'approval-pending', 'approved', 'rejected', 'in-progress', 'resolved', 'closed'],
    default: 'open',
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  rejectionReason: {
    type: String,
    trim: true,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    attachments: [{
      filename: String,
      path: String,
      size: Number,
    }],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // Email tracking
  emailMessageId: {
    type: String,
    default: null,
    index: true,
  },
  sourceEmail: {
    type: String,
    default: null,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  dueDate: {
    type: Date,
    default: null,
  },
  responseDueDate: {
    type: Date,
    default: null,
  },
  slaResponseTime: {
    type: Number, // in hours
    default: null,
  },
  slaResolutionTime: {
    type: Number, // in hours
    default: null,
  },
  // SLA tracking fields
  slaResponseBreached: {
    type: Boolean,
    default: false,
  },
  slaResponseBreachedAt: {
    type: Date,
    default: null,
  },
  slaResponseWarningSent: {
    type: Boolean,
    default: false,
  },
  slaResolutionBreached: {
    type: Boolean,
    default: false,
  },
  slaResolutionBreachedAt: {
    type: Date,
    default: null,
  },
  slaResolutionWarningSent: {
    type: Boolean,
    default: false,
  },
  attachments: [{
    filename: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
})

// Auto-increment ticket ID (only if not manually provided)
ticketSchema.pre('save', async function(next) {
  // Only auto-generate ticketId if it's a new ticket and ticketId is not provided
  if (this.isNew && !this.ticketId) {
    try {
      const Ticket = mongoose.model('Ticket')
      // Find the highest ticketId
      const lastTicket = await Ticket.findOne().sort({ ticketId: -1 }).exec()
      
      if (lastTicket && lastTicket.ticketId) {
        // Auto-increment from the highest ticketId
        this.ticketId = lastTicket.ticketId + 1
      } else {
        // If no tickets exist, start from 1000
        this.ticketId = 1000
      }
    } catch (error) {
      // If error occurs, default to 1000
      this.ticketId = 1000
    }
  }
  // If ticketId is manually provided, use it as-is (no auto-generation)
  next()
})

export default mongoose.model('Ticket', ticketSchema)

