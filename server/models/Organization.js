import mongoose from 'mongoose'

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  domain: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  settings: {
    allowSelfRegistration: {
      type: Boolean,
      default: false,
    },
    defaultRole: {
      type: String,
      enum: ['user', 'agent'],
      default: 'user',
    },
  },
}, {
  timestamps: true,
})

export default mongoose.model('Organization', organizationSchema)

