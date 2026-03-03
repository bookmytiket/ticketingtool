import mongoose from 'mongoose'

const ssoConfigSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['azure', 'google', 'saml', 'oauth'],
    required: true,
    unique: true,
  },
  enabled: {
    type: Boolean,
    default: false,
  },
  config: {
    // Azure AD
    tenantId: String,
    clientId: String,
    clientSecret: String,
    
    // Google Workspace
    clientID: String,
    clientSecret: String,
    domain: String,
    
    // SAML
    entryPoint: String,
    issuer: String,
    cert: String,
    
    // OAuth
    authorizationURL: String,
    tokenURL: String,
    userInfoURL: String,
  },
}, {
  timestamps: true,
})

export default mongoose.model('SSOConfig', ssoConfigSchema)

