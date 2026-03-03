import mongoose from 'mongoose'

const chatMessageSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatSession',
    required: true,
    index: true,
  },
  sender: {
    type: String,
    enum: ['user', 'bot', 'technician'],
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  content: {
    type: String,
    required: true,
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'ticket_created', 'ticket_status', 'quick_action', 'system'],
    default: 'text',
  },
  attachments: [{
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
  }],
  intent: {
    type: String,
    enum: ['create_ticket', 'check_status', 'faq', 'escalate', 'greeting', 'ticket_creation_step', 'unknown'],
    default: 'unknown',
  },
  confidence: {
    type: Number,
    default: 0,
  },
  metadata: {
    ticketId: Number,
    action: String,
    quickAction: String,
  },
}, {
  timestamps: true,
})

chatMessageSchema.index({ session: 1, createdAt: 1 })

export default mongoose.model('ChatMessage', chatMessageSchema)

