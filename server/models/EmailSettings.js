import mongoose from 'mongoose'

const emailSettingsSchema = new mongoose.Schema({
  smtp: {
    host: String,
    port: Number,
    secure: Boolean,
    auth: {
      user: String,
      pass: String,
      oauth2: {
        enabled: {
          type: Boolean,
          default: false,
        },
        clientId: String,
        clientSecret: String,
        refreshToken: String,
        accessToken: String,
        expiresAt: Date,
      },
    },
    fromEmail: String,
    fromName: String,
    enabled: {
      type: Boolean,
      default: false,
    },
  },
  imap: {
    host: String,
    port: Number,
    secure: Boolean,
    auth: {
      user: String,
      pass: String,
      oauth2: {
        enabled: {
          type: Boolean,
          default: false,
        },
        clientId: String,
        clientSecret: String,
        refreshToken: String,
        accessToken: String,
        expiresAt: Date,
      },
    },
    folder: {
      type: String,
      default: 'INBOX',
    },
    enabled: {
      type: Boolean,
      default: false,
    },
  },
  domainRules: {
    enabled: {
      type: Boolean,
      default: false,
    },
    whitelist: {
      type: [String],
      default: [],
    },
    blacklist: {
      type: [String],
      default: [],
    },
  },
}, {
  timestamps: true,
})

// Only one email settings document
emailSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne()
  if (!settings) {
    settings = await this.create({})
  }
  return settings
}

export default mongoose.model('EmailSettings', emailSettingsSchema)

