import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Upload, Image as ImageIcon, X, Save, Eye, EyeOff } from 'lucide-react'
import { adminAPI } from '../../services/api'
import { useLogo } from '../../contexts/LogoContext'
import toast from 'react-hot-toast'

export const LogoManagement = () => {
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('/logo.svg')
  const [logoUrl, setLogoUrl] = useState('')
  const [showOnLogin, setShowOnLogin] = useState(true)
  const [loginTitle, setLoginTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const { updateLogo, updateShowOnLogin, updateLoginTitle, reloadLogo } = useLogo()

  useEffect(() => {
    loadLogo()
  }, [])

  const loadLogo = async () => {
    try {
      const response = await adminAPI.getLogo()
      if (response.logo) {
        setLogoPreview(response.logo)
      } else {
        // Use default logo if no logo in database
        setLogoPreview('/logo.svg')
      }
      if (response.showOnLogin !== undefined) {
        setShowOnLogin(response.showOnLogin)
      }
      if (response.loginTitle !== undefined) {
        setLoginTitle(response.loginTitle || '')
      }
    } catch (error) {
      console.error('Failed to load logo:', error)
      // Fallback to default logo on error
      setLogoPreview('/logo.svg')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size should be less than 2MB')
        return
      }
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUrlChange = (e) => {
    setLogoUrl(e.target.value)
  }

  const handleLoadFromUrl = () => {
    if (!logoUrl) {
      toast.error('Please enter a valid URL')
      return
    }
    setLogoPreview(logoUrl)
    toast.success('Logo loaded from URL')
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await adminAPI.updateLogo(logoPreview, logoFile?.name || 'logo', showOnLogin, loginTitle || null)
      // Update logo in context to reflect changes immediately
      updateLogo(logoPreview)
      updateShowOnLogin(showOnLogin)
      updateLoginTitle(loginTitle || null)
      // Reload logo from server to ensure consistency
      await reloadLogo()
      toast.success('Logo settings saved successfully!')
      setLogoFile(null)
    } catch (error) {
      toast.error(error.message || 'Failed to save logo')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (window.confirm('Are you sure you want to remove the logo from the login page? This will hide it but keep the logo file.')) {
      setShowOnLogin(false)
      try {
        await adminAPI.updateLogo(logoPreview, logoFile?.name || 'logo', false)
        updateShowOnLogin(false)
        await reloadLogo()
        toast.success('Logo removed from login page')
      } catch (error) {
        toast.error('Failed to update logo settings')
        setShowOnLogin(true) // Revert on error
      }
    }
  }

  const handleShowLogo = async () => {
    setShowOnLogin(true)
    try {
      await adminAPI.updateLogo(logoPreview, logoFile?.name || 'logo', true)
      updateShowOnLogin(true)
      await reloadLogo()
      toast.success('Logo will now be shown on login page')
    } catch (error) {
      toast.error('Failed to update logo settings')
      setShowOnLogin(false) // Revert on error
    }
  }

  const handleReset = async () => {
    try {
      setLogoPreview('/logo.svg')
      setLogoFile(null)
      setLogoUrl('')
      toast.success('Logo reset to default')
    } catch (error) {
      toast.error('Failed to reset logo')
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
            Logo Management
          </h1>
          <p className="text-sm text-gray-600">Upload and manage your organization's logo</p>
        </div>

        <Card title="Current Logo">
          <div className="flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl mb-6 border border-gray-200">
            <img 
              src={logoPreview} 
              alt="Logo Preview" 
              className="max-h-32 max-w-full object-contain"
              onError={() => {
                setLogoPreview('/logo.svg')
                toast.error('Failed to load logo, using default')
              }}
            />
          </div>
          
          {/* Login Page Visibility Toggle */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50/50 to-primary-100/30 rounded-xl border border-primary-200/50 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              {showOnLogin ? (
                <Eye className="text-primary-600" size={20} />
              ) : (
                <EyeOff className="text-gray-400" size={20} />
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Show Logo on Login Page
                </p>
                <p className="text-xs text-gray-600">
                  {showOnLogin ? 'Logo is currently visible on the login page' : 'Logo is hidden on the login page'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {showOnLogin ? (
                <Button
                  variant="outline"
                  transparent
                  onClick={handleRemoveLogo}
                  className="flex items-center gap-2"
                >
                  <EyeOff size={16} />
                  Remove from Login
                </Button>
              ) : (
                <Button
                  transparent
                  onClick={handleShowLogo}
                  className="flex items-center gap-2"
                >
                  <Eye size={16} />
                  Show on Login
                </Button>
              )}
            </div>
          </div>

          {/* Login Title Section */}
          <div className="mt-6 p-4 bg-gradient-to-r from-primary-50/50 to-primary-100/30 rounded-xl border border-primary-200/50 backdrop-blur-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Login Page Welcome Title (Optional)
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Enter a custom welcome title to display on the login page. Leave empty to hide the title.
            </p>
            <Input
              type="text"
              placeholder="e.g., Welcome to Rezilyens"
              value={loginTitle}
              onChange={(e) => setLoginTitle(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-2">
              {loginTitle ? `Title will show as: "${loginTitle}"` : 'No title will be displayed on login page'}
            </p>
          </div>
        </Card>

        <Card title="Upload Logo">
          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Upload Logo File
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 transition-all duration-300 bg-white/50 backdrop-blur-sm hover:bg-white/80">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        {logoFile ? logoFile.name : 'Click to upload or drag and drop'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG up to 2MB</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* URL Input */}
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Or Enter Logo URL
              </label>
              <div className="flex space-x-2">
                <Input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={handleUrlChange}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  transparent
                  onClick={handleLoadFromUrl}
                >
                  <ImageIcon size={20} className="mr-2" />
                  Load
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                transparent
                onClick={handleReset}
                className="flex-1"
              >
                <X size={20} className="mr-2" />
                Reset to Default
              </Button>
              <Button
                transparent
                onClick={handleSave}
                disabled={loading}
                className="flex-1"
              >
                <Save size={20} className="mr-2" />
                {loading ? 'Saving...' : 'Save Logo'}
              </Button>
            </div>

            <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The logo will be displayed in the sidebar and optionally on the login page. 
                Recommended size: 200x60px or similar aspect ratio. Supported formats: PNG, JPG, SVG.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
