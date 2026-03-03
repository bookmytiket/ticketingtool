import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { ArrowLeft, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export const OAuthLogin = () => {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [authorizationUrl, setAuthorizationUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Simulate OAuth authentication
    setTimeout(() => {
      login({
        id: 1,
        name: 'OAuth User',
        email: 'oauth@example.com',
        role: 'user',
        mfaEnabled: false,
      })
      toast.success('OAuth authentication successful!')
      navigate('/dashboard')
      setLoading(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="w-full max-w-md">
        <Button
          variant="outline"
          onClick={() => navigate('/login')}
          className="mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Login
        </Button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">OAuth SSO</h1>
          <p className="text-gray-600">Sign in with OAuth 2.0</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Client ID"
              placeholder="your-client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            />

            <Input
              type="password"
              label="Client Secret"
              placeholder="your-client-secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required
            />

            <Input
              label="Authorization URL"
              placeholder="https://oauth-provider.com/authorize"
              value={authorizationUrl}
              onChange={(e) => setAuthorizationUrl(e.target.value)}
              required
            />

            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
              <p className="font-medium mb-2">OAuth Configuration:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Redirect URI: {window.location.origin}/oauth/callback</li>
                <li>Ensure scopes are properly configured</li>
                <li>Client credentials must be valid</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Authenticating...' : 'Authenticate with OAuth'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

