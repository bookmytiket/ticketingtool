import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Mail, Server, Lock, Send } from 'lucide-react'
import { adminAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export const EmailSettings = () => {
  const { user } = useAuth()
  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: '587',
    encryption: 'tls',
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'Ticketing Tool',
    useOAuth2: false,
    oauth2: {
      clientId: '',
      clientSecret: '',
      refreshToken: '',
    },
  })

  const [imapSettings, setImapSettings] = useState({
    host: '',
    port: '993',
    encryption: 'ssl',
    username: '',
    password: '',
    folder: 'INBOX',
    useOAuth2: false,
    oauth2: {
      clientId: '',
      clientSecret: '',
      refreshToken: '',
    },
  })

  const [testEmail, setTestEmail] = useState(user?.email || '')
  const [loading, setLoading] = useState(false)
  const [testingSMTP, setTestingSMTP] = useState(false)
  const [testingIMAP, setTestingIMAP] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const settings = await adminAPI.getEmailSettings()
      
      if (settings.smtp) {
        // Determine encryption based on secure flag and port
        let encryption = 'none'
        if (settings.smtp.secure) {
          encryption = settings.smtp.port === 465 ? 'ssl' : 'tls'
        } else if (settings.smtp.port === 587 || settings.smtp.port === 465) {
          // If port is 587 or 465, default to TLS/SSL even if secure flag is false
          encryption = settings.smtp.port === 465 ? 'ssl' : 'tls'
        }
        
        // Auto-detect Office365 and force TLS
        const isOffice365 = settings.smtp.host && (
          settings.smtp.host.includes('office365.com') || 
          settings.smtp.host.includes('outlook.com')
        )
        if (isOffice365 && encryption === 'none') {
          encryption = 'tls'
        }
        
        setSmtpSettings({
          host: settings.smtp.host || '',
          port: settings.smtp.port?.toString() || '587',
          encryption: encryption,
          username: settings.smtp.auth?.user || '',
          password: settings.smtp.auth?.pass || '',
          fromEmail: settings.smtp.fromEmail || settings.smtp.auth?.user || '',
          fromName: settings.smtp.fromName || 'Ticketing Tool',
          useOAuth2: settings.smtp.auth?.oauth2?.enabled || false,
          oauth2: {
            clientId: settings.smtp.auth?.oauth2?.clientId || '',
            clientSecret: settings.smtp.auth?.oauth2?.clientSecret || '',
            refreshToken: settings.smtp.auth?.oauth2?.refreshToken || '',
          },
        })
      }

      if (settings.imap) {
        const encryption = settings.imap.secure ? 'ssl' : 'none'
        
        setImapSettings({
          host: settings.imap.host || '',
          port: settings.imap.port?.toString() || '993',
          encryption: encryption,
          username: settings.imap.auth?.user || '',
          password: settings.imap.auth?.pass || '',
          folder: settings.imap.folder || 'INBOX',
          useOAuth2: settings.imap.auth?.oauth2?.enabled || false,
          oauth2: {
            clientId: settings.imap.auth?.oauth2?.clientId || '',
            clientSecret: settings.imap.auth?.oauth2?.clientSecret || '',
            refreshToken: settings.imap.auth?.oauth2?.refreshToken || '',
          },
        })
      }

    } catch (error) {
      console.error('Failed to load email settings:', error)
    }
  }

  const handleSMTPSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Build SMTP data structure that matches backend expectations
      const smtpData = {
        host: smtpSettings.host,
        port: smtpSettings.port,
        encryption: smtpSettings.encryption,
        username: smtpSettings.username,
        password: smtpSettings.password,
        fromEmail: smtpSettings.fromEmail,
        fromName: smtpSettings.fromName,
        useOAuth2: smtpSettings.useOAuth2, // Add this flag for backend
        oauth2: smtpSettings.useOAuth2 ? {
          clientId: smtpSettings.oauth2.clientId,
          clientSecret: smtpSettings.oauth2.clientSecret,
          refreshToken: smtpSettings.oauth2.refreshToken,
        } : undefined,
        auth: smtpSettings.useOAuth2 ? {
          user: smtpSettings.username,
          oauth2: {
            clientId: smtpSettings.oauth2.clientId,
            clientSecret: smtpSettings.oauth2.clientSecret,
            refreshToken: smtpSettings.oauth2.refreshToken,
            enabled: true,
          }
        } : {
          user: smtpSettings.username,
          pass: smtpSettings.password,
        }
      }
      await adminAPI.updateEmailSettings({ smtp: smtpData })
      toast.success('SMTP settings saved successfully!')
    } catch (error) {
      console.error('SMTP save error:', error)
      toast.error(error.message || 'Failed to save SMTP settings')
    } finally {
      setLoading(false)
    }
  }

  const handleIMAPSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Build IMAP data structure that matches backend expectations
      const imapData = {
        host: imapSettings.host,
        port: imapSettings.port,
        encryption: imapSettings.encryption,
        username: imapSettings.username,
        password: imapSettings.password,
        folder: imapSettings.folder,
        useOAuth2: imapSettings.useOAuth2, // Add this flag for backend
        oauth2: imapSettings.useOAuth2 ? {
          clientId: imapSettings.oauth2.clientId,
          clientSecret: imapSettings.oauth2.clientSecret,
          refreshToken: imapSettings.oauth2.refreshToken,
        } : undefined,
        auth: imapSettings.useOAuth2 ? {
          user: imapSettings.username,
          oauth2: {
            clientId: imapSettings.oauth2.clientId,
            clientSecret: imapSettings.oauth2.clientSecret,
            refreshToken: imapSettings.oauth2.refreshToken,
            enabled: true,
          }
        } : {
          user: imapSettings.username,
          pass: imapSettings.password,
        }
      }
      await adminAPI.updateEmailSettings({ imap: imapData })
      toast.success('IMAP settings saved successfully!')
    } catch (error) {
      console.error('IMAP save error:', error)
      toast.error(error.message || 'Failed to save IMAP settings')
    } finally {
      setLoading(false)
    }
  }

  const handleTestSMTP = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address to send test email')
      return
    }

    if (!smtpSettings.host || !smtpSettings.username || !smtpSettings.password) {
      toast.error('Please fill in all required SMTP fields before testing')
      return
    }

    // Validate Office365 settings
    const isOffice365 = smtpSettings.host && (
      smtpSettings.host.includes('office365.com') || 
      smtpSettings.host.includes('outlook.com')
    )
    
    if (isOffice365) {
      if (smtpSettings.encryption !== 'tls') {
        toast.error('Office365 requires TLS encryption. Please change Encryption to TLS.', { duration: 6000 })
        return
      }
      if (smtpSettings.port !== '587') {
        toast.error('Office365 requires port 587 with TLS. Please change Port to 587.', { duration: 6000 })
        return
      }
    }

    setTestingSMTP(true)
    try {
      // Convert settings to backend format
      // For Office365, secure should be false (uses STARTTLS, not direct SSL)
      const secure = smtpSettings.encryption === 'ssl' && smtpSettings.port === '465'
      
      const settings = {
        host: smtpSettings.host,
        port: smtpSettings.port,
        secure: secure,
        auth: {
          user: smtpSettings.username,
          pass: smtpSettings.password,
        },
        fromEmail: smtpSettings.fromEmail,
        fromName: smtpSettings.fromName,
      }

      const result = await adminAPI.testSMTP(testEmail, settings)
      toast.success(result.message || 'Test email sent successfully! Please check your inbox.')
    } catch (error) {
      // Show detailed error message
      const errorMessage = error.message || 'Failed to send test email. Please check your SMTP settings.'
      
      // Check if it's an Office365 authentication error
      if (errorMessage.includes('535') || errorMessage.includes('Authentication unsuccessful') || errorMessage.includes('EAUTH')) {
        const detailedError = errorMessage.split('\n').join(' | ')
        toast.error(
          'Office365 Authentication Failed! ' +
          'Please verify: 1) App Password is 16 characters (no spaces), 2) SMTP AUTH enabled for your mailbox, 3) Try creating a new App Password',
          { duration: 12000 }
        )
        console.error('Detailed error:', detailedError)
        
        // Show additional help in console
        console.log('Office365 Troubleshooting:')
        console.log('1. App Password should be exactly 16 characters')
        console.log('2. No spaces before or after the password')
        console.log('3. SMTP AUTH must be enabled: Set-CASMailbox -Identity "your-email" -SmtpClientAuthenticationDisabled $false')
        console.log('4. Try creating a new App Password from Microsoft Account Security')
      } else {
        toast.error(errorMessage, { duration: 6000 })
      }
    } finally {
      setTestingSMTP(false)
    }
  }

  const handleTestIMAP = async () => {
    if (!imapSettings.host || !imapSettings.username || !imapSettings.password) {
      toast.error('Please fill in all required IMAP fields before testing')
      return
    }

    setTestingIMAP(true)
    try {
      // Convert settings to backend format
      const settings = {
        host: imapSettings.host,
        port: imapSettings.port,
        secure: imapSettings.encryption === 'ssl' || imapSettings.encryption === 'tls',
        auth: {
          user: imapSettings.username,
          pass: imapSettings.password,
        },
        folder: imapSettings.folder || 'INBOX',
      }

      const result = await adminAPI.testIMAP(settings)
      toast.success(result.message || 'IMAP connection successful!')
    } catch (error) {
      toast.error(error.message || 'Failed to connect to IMAP server. Please check your IMAP settings.')
    } finally {
      setTestingIMAP(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
          <p className="text-gray-600 mt-1">Configure SMTP and IMAP settings for email notifications and ticket creation</p>
        </div>

        {/* SMTP Settings */}
        <Card title="SMTP Settings (Outgoing Email)">
          <form onSubmit={handleSMTPSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="SMTP Host *"
                value={smtpSettings.host}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                required
                icon={<Server size={20} />}
                placeholder="smtp.office365.com"
              />

              <Input
                label="SMTP Port *"
                type="number"
                value={smtpSettings.port}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
                required
                placeholder="587"
              />
            </div>

            <Select
              label="Encryption *"
              value={smtpSettings.encryption}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, encryption: e.target.value })}
              options={[
                { value: 'none', label: 'None' },
                { value: 'tls', label: 'TLS (Required for Office365)' },
                { value: 'ssl', label: 'SSL' },
              ]}
              required
            />
            {smtpSettings.host && (smtpSettings.host.includes('office365.com') || smtpSettings.host.includes('outlook.com')) && smtpSettings.encryption === 'none' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                <p className="font-medium">⚠️ Office365 requires TLS encryption!</p>
                <p>Please change Encryption to "TLS" for Office365 to work properly.</p>
              </div>
            )}

            {/* Auth Mode for SMTP */}
            <Select
              label="Authentication Method"
              value={smtpSettings.useOAuth2 ? 'oauth2' : 'password'}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, useOAuth2: e.target.value === 'oauth2' })}
              options={[
                { value: 'password', label: 'App Password' },
                { value: 'oauth2', label: 'OAuth2' },
              ]}
            />

            {smtpSettings.useOAuth2 ? (
              /* OAuth2 Configuration for SMTP */
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">OAuth2 Configuration</h3>
                <Input
                  label="Email Address *"
                  value={smtpSettings.username}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, username: e.target.value })}
                  required
                  icon={<Mail size={20} />}
                  placeholder="shared-email@example.com"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Client ID *"
                    value={smtpSettings.oauth2.clientId}
                    onChange={(e) => setSmtpSettings({
                      ...smtpSettings,
                      oauth2: { ...smtpSettings.oauth2, clientId: e.target.value }
                    })}
                    required
                    placeholder="Your OAuth2 Client ID"
                  />
                  <Input
                    type="password"
                    label="Client Secret *"
                    value={smtpSettings.oauth2.clientSecret}
                    onChange={(e) => setSmtpSettings({
                      ...smtpSettings,
                      oauth2: { ...smtpSettings.oauth2, clientSecret: e.target.value }
                    })}
                    required
                    placeholder="Your OAuth2 Client Secret"
                  />
                </div>
                <Input
                  label="Refresh Token *"
                  type="password"
                  value={smtpSettings.oauth2.refreshToken}
                  onChange={(e) => setSmtpSettings({
                    ...smtpSettings,
                    oauth2: { ...smtpSettings.oauth2, refreshToken: e.target.value }
                  })}
                  required
                  placeholder="OAuth2 Refresh Token"
                />
                <p className="text-xs text-blue-700">
                  OAuth2 allows secure authentication for shared email accounts without storing passwords.
                  Generate credentials from your email provider's developer console (Microsoft Azure AD, Google Cloud Console, etc.).
                </p>
              </div>
            ) : (
              /* Username/Password Configuration for SMTP */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Username *"
                  value={smtpSettings.username}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, username: e.target.value })}
                  required
                  icon={<Mail size={20} />}
                  placeholder="your-email@example.com"
                />

                <Input
                  type="password"
                  label="Password *"
                  value={smtpSettings.password}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
                  required={!smtpSettings.useOAuth2}
                  disabled={smtpSettings.useOAuth2}
                  icon={<Lock size={20} />}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="email"
                label="From Email *"
                value={smtpSettings.fromEmail}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, fromEmail: e.target.value })}
                required
                placeholder="noreply@example.com"
              />

              <Input
                label="From Name *"
                value={smtpSettings.fromName}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, fromName: e.target.value })}
                required
                placeholder="Ticketing Tool"
              />
            </div>

            {/* Test Email Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send Test Email
              </label>
              <div className="flex space-x-2">
                <Input
                  type="email"
                  placeholder="Enter email address to receive test email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleTestSMTP}
                  disabled={testingSMTP || !testEmail}
                >
                  <Send size={16} className="mr-2" />
                  {testingSMTP ? 'Sending...' : 'Send Test Email'}
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Enter your email address and click "Send Test Email" to verify your SMTP configuration.
              </p>
              {(smtpSettings.host && (smtpSettings.host.includes('office365.com') || smtpSettings.host.includes('outlook.com'))) && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <p className="font-medium mb-1">⚠️ Office365 Authentication Requirements:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Use an <strong>App Password</strong> (not your regular password) if MFA is enabled</li>
                    <li>Copy the App Password exactly (no spaces before/after)</li>
                    <li>Make sure SMTP AUTH is enabled in your Office365 admin center</li>
                    <li>Port 587 with TLS is required for Office365</li>
                  </ul>
                  <p className="mt-2">Create App Password: <a href="https://account.microsoft.com/security" target="_blank" rel="noopener noreferrer" className="underline font-medium">Microsoft Account Security</a> → App passwords</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save SMTP Settings'}
              </Button>
            </div>
          </form>
        </Card>

        {/* IMAP Settings */}
        <Card title="IMAP Settings (Incoming Email)">
          <form onSubmit={handleIMAPSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="IMAP Host *"
                value={imapSettings.host}
                onChange={(e) => setImapSettings({ ...imapSettings, host: e.target.value })}
                required
                icon={<Server size={20} />}
                placeholder="imap.office365.com"
              />

              <Input
                label="IMAP Port *"
                type="number"
                value={imapSettings.port}
                onChange={(e) => setImapSettings({ ...imapSettings, port: e.target.value })}
                required
                placeholder="993"
              />
            </div>

            <Select
              label="Encryption *"
              value={imapSettings.encryption}
              onChange={(e) => setImapSettings({ ...imapSettings, encryption: e.target.value })}
              options={[
                { value: 'none', label: 'None' },
                { value: 'ssl', label: 'SSL' },
                { value: 'tls', label: 'TLS' },
              ]}
              required
            />

            {/* OAuth2 Toggle */}
            {/* Auth Mode for IMAP */}
            <Select
              label="Authentication Method"
              value={imapSettings.useOAuth2 ? 'oauth2' : 'password'}
              onChange={(e) => setImapSettings({ ...imapSettings, useOAuth2: e.target.value === 'oauth2' })}
              options={[
                { value: 'password', label: 'App Password' },
                { value: 'oauth2', label: 'OAuth2' },
              ]}
            />

            {imapSettings.useOAuth2 ? (
              /* OAuth2 Configuration */
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">OAuth2 Configuration</h3>
                <Input
                  label="Email Address *"
                  value={imapSettings.username}
                  onChange={(e) => setImapSettings({ ...imapSettings, username: e.target.value })}
                  required
                  icon={<Mail size={20} />}
                  placeholder="shared-email@example.com"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Client ID *"
                    value={imapSettings.oauth2.clientId}
                    onChange={(e) => setImapSettings({
                      ...imapSettings,
                      oauth2: { ...imapSettings.oauth2, clientId: e.target.value }
                    })}
                    required
                    placeholder="Your OAuth2 Client ID"
                  />
                  <Input
                    type="password"
                    label="Client Secret *"
                    value={imapSettings.oauth2.clientSecret}
                    onChange={(e) => setImapSettings({
                      ...imapSettings,
                      oauth2: { ...imapSettings.oauth2, clientSecret: e.target.value }
                    })}
                    required
                    placeholder="Your OAuth2 Client Secret"
                  />
                </div>
                <Input
                  label="Refresh Token *"
                  type="password"
                  value={imapSettings.oauth2.refreshToken}
                  onChange={(e) => setImapSettings({
                    ...imapSettings,
                    oauth2: { ...imapSettings.oauth2, refreshToken: e.target.value }
                  })}
                  required
                  placeholder="OAuth2 Refresh Token"
                />
                <p className="text-xs text-blue-700">
                  OAuth2 allows secure authentication for shared email accounts without storing passwords.
                  Generate credentials from your email provider's developer console.
                </p>
              </div>
            ) : (
              /* Username/Password Configuration */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Username *"
                  value={imapSettings.username}
                  onChange={(e) => setImapSettings({ ...imapSettings, username: e.target.value })}
                  required
                  icon={<Mail size={20} />}
                  placeholder="your-email@example.com"
                />

                <Input
                  type="password"
                  label="Password *"
                  value={imapSettings.password}
                  onChange={(e) => setImapSettings({ ...imapSettings, password: e.target.value })}
                  required
                  icon={<Lock size={20} />}
                />
              </div>
            )}

            <Input
              label="Folder"
              value={imapSettings.folder}
              onChange={(e) => setImapSettings({ ...imapSettings, folder: e.target.value })}
              placeholder="INBOX"
            />

            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
              <p className="font-medium mb-2">IMAP Configuration Notes:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Emails sent to the configured address will automatically create tickets</li>
                <li>Email subject becomes ticket title</li>
                <li>Email body becomes ticket description</li>
                <li>Replies to ticket emails will be added as comments</li>
              </ul>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleTestIMAP}
                disabled={testingIMAP}
              >
                {testingIMAP ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save IMAP Settings'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  )
}
