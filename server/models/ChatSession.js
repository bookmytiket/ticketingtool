import mongoose from 'mongoose'

const chatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    unique: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'escalated', 'closed'],
    default: 'active',
  },
  resolvedBy: {
    type: String,
    enum: ['bot', 'technician', 'system'],
    default: 'bot',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
  },
  ticketId: {
    type: Number,
    default: null,
    index: true,
  },
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    default: null,
  },
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({
      conversationState: 'idle',
      ticketDraft: {},
      currentStep: 0,
    }),
  },
  escalatedAt: {
    type: Date,
    default: null,
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
})

// Generate unique session ID if not provided (backup for pre-save)
chatSessionSchema.pre('save', async function(next) {
  if (!this.sessionId) {
    this.sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  next()
})

// Also ensure sessionId is set on create
chatSessionSchema.pre('validate', function(next) {
  if (!this.sessionId) {
    this.sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  next()
})

export default mongoose.model('ChatSession', chatSessionSchema)

