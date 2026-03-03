import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../contexts/AuthContext'
import { User, Shield, Mail, Phone, Key } from 'lucide-react'
import toast from 'react-hot-toast'

export const Profile = () => {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    department: '',
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)

    setTimeout(() => {
      updateUser({ ...user, ...formData })
      toast.success('Profile updated successfully!')
      setLoading(false)
    }, 1000)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setTimeout(() => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Password changed successfully!')
      setLoading(false)
    }, 1000)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
        </div>

        {/* Profile Information */}
        <Card title="Profile Information">
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="flex items-center space-x-6 mb-6">
              <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <Button variant="outline" type="button">Change Photo</Button>
                <p className="text-sm text-gray-500 mt-2">JPG, PNG or GIF. Max size 2MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                name="name"
                label="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
                icon={<User size={20} />}
              />

              <Input
                name="email"
                type="email"
                label="Email"
                value={formData.email}
                onChange={handleChange}
                required
                icon={<Mail size={20} />}
              />

              <Input
                name="phone"
                type="tel"
                label="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                icon={<Phone size={20} />}
              />

              <Input
                name="department"
                label="Department"
                value={formData.department}
                onChange={handleChange}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Security Settings */}
        <Card title="Security">
          <div className="space-y-6">
            {/* MFA Section */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Shield className="text-primary-600" size={24} />
                <div>
                  <h3 className="font-medium text-gray-900">Multi-Factor Authentication</h3>
                  <p className="text-sm text-gray-600">
                    {user?.mfaEnabled ? 'MFA is enabled' : 'Add an extra layer of security to your account'}
                  </p>
                </div>
              </div>
              {user?.mfaEnabled ? (
                <Badge variant="success">Enabled</Badge>
              ) : (
                <Button variant="outline" onClick={() => navigate('/mfa-setup')}>
                  Enable MFA
                </Button>
              )}
            </div>

            {/* Password Change */}
            <form onSubmit={handlePasswordChange} className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4">Change Password</h3>
              
              <Input
                type="password"
                label="Current Password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
                icon={<Key size={20} />}
              />

              <Input
                type="password"
                label="New Password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                icon={<Key size={20} />}
              />

              <Input
                type="password"
                label="Confirm New Password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                icon={<Key size={20} />}
              />

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

