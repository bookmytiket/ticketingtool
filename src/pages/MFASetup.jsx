import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Layout } from '../components/layout/Layout'
import { Shield, CheckCircle } from 'lucide-react'
import { mfaAPI } from '../services/api'
import toast from 'react-hot-toast'

export const MFASetup = () => {
  const [step, setStep] = useState(1)
  const [qrCode, setQrCode] = useState(null)
  const [secret, setSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const { updateUser, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (step === 2 && !qrCode) {
      loadMFASetup()
    }
  }, [step])

  const loadMFASetup = async () => {
    try {
      setLoading(true)
      const data = await mfaAPI.getSetup()
      setQrCode(data.qrCode)
      setSecret(data.manualEntryKey)
    } catch (error) {
      toast.error(error.message || 'Failed to load MFA setup')
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  const handleEnable = () => {
    setStep(2)
  }

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code')
      return
    }

    try {
      setLoading(true)
      await mfaAPI.verify(verificationCode)
      updateUser({ ...user, mfaEnabled: true })
      toast.success('MFA enabled successfully!')
      navigate('/profile')
    } catch (error) {
      toast.error(error.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  if (step === 1) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                <Shield className="text-primary-600" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Enable Multi-Factor Authentication</h1>
              <p className="text-gray-600">Add an extra layer of security to your account</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-green-500 mt-1" size={20} />
                <div>
                  <h3 className="font-medium text-gray-900">Enhanced Security</h3>
                  <p className="text-sm text-gray-600">Protect your account with two-factor authentication</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-green-500 mt-1" size={20} />
                <div>
                  <h3 className="font-medium text-gray-900">Easy Setup</h3>
                  <p className="text-sm text-gray-600">Scan QR code with your authenticator app</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-green-500 mt-1" size={20} />
                <div>
                  <h3 className="font-medium text-gray-900">Compatible Apps</h3>
                  <p className="text-sm text-gray-600">Google Authenticator, Microsoft Authenticator, Authy</p>
                </div>
              </div>
            </div>

            <Button onClick={handleEnable} className="w-full">
              Enable MFA
            </Button>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Scan QR Code</h1>
            <p className="text-gray-600">Use your authenticator app to scan this code</p>
          </div>

          <div className="flex flex-col items-center space-y-6 mb-6">
            {loading ? (
              <div className="flex items-center justify-center w-48 h-48 bg-gray-100 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : qrCode ? (
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
            ) : (
              <div className="bg-gray-100 p-4 rounded-lg border-2 border-gray-200 w-48 h-48 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Loading QR Code...</p>
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Or enter this code manually:</p>
              <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-lg font-mono text-sm">
                {secret}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Verification Code"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
            />

            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleVerify} className="flex-1" disabled={verificationCode.length !== 6 || loading}>
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

