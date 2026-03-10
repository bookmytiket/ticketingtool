import { useEffect, useState } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Shield, Plus, X } from 'lucide-react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

export const DomainRules = () => {
  const [domainRules, setDomainRules] = useState({
    enabled: false,
    whitelist: [],
    blacklist: [],
  })
  const [newWhitelistDomain, setNewWhitelistDomain] = useState('')
  const [newBlacklistDomain, setNewBlacklistDomain] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const settings = await adminAPI.getEmailSettings()
      if (settings.domainRules) {
        setDomainRules({
          enabled: settings.domainRules.enabled ?? false,
          whitelist: settings.domainRules.whitelist || [],
          blacklist: settings.domainRules.blacklist || [],
        })
      }
    } catch (error) {
      toast.error('Failed to load domain rules')
    }
  }

  const normalizeDomain = (domain) => domain.trim().replace(/^@/, '').toLowerCase()

  const addWhitelistDomain = () => {
    const normalized = normalizeDomain(newWhitelistDomain || '')
    if (!normalized) {
      toast.error('Please enter a valid domain')
      return
    }
    if (domainRules.whitelist.includes(normalized)) {
      toast.error('Domain already in whitelist')
      return
    }
    setDomainRules({
      ...domainRules,
      whitelist: [...domainRules.whitelist, normalized],
    })
    setNewWhitelistDomain('')
  }

  const removeWhitelistDomain = (domain, e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setDomainRules({
      ...domainRules,
      whitelist: domainRules.whitelist.filter((d) => d !== domain),
    })
    toast.success(`Removed ${domain} from whitelist`)
  }

  const addBlacklistDomain = () => {
    const normalized = normalizeDomain(newBlacklistDomain || '')
    if (!normalized) {
      toast.error('Please enter a valid domain')
      return
    }
    if (domainRules.blacklist.includes(normalized)) {
      toast.error('Domain already in blacklist')
      return
    }
    setDomainRules({
      ...domainRules,
      blacklist: [...domainRules.blacklist, normalized],
    })
    setNewBlacklistDomain('')
  }

  const removeBlacklistDomain = (domain, e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setDomainRules({
      ...domainRules,
      blacklist: domainRules.blacklist.filter((d) => d !== domain),
    })
    toast.success(`Removed ${domain} from blacklist`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await adminAPI.updateEmailSettings({ domainRules })
      toast.success('Domain rules saved successfully')
    } catch (error) {
      toast.error(error.message || 'Failed to save domain rules')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Shield size={20} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Domain Rules</h1>
            <p className="text-gray-600 mt-1">
              Control which external domains can create tickets via email.
            </p>
          </div>
        </div>

        <Card title="Domain Rules (Incoming Email)">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Select
              label="Domain Filtering"
              value={domainRules.enabled ? 'enabled' : 'disabled'}
              onChange={(e) =>
                setDomainRules({ ...domainRules, enabled: e.target.value === 'enabled' })
              }
              options={[
                { value: 'enabled', label: 'Enabled (reject non-whitelisted & blacklisted)' },
                { value: 'disabled', label: 'Disabled' },
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Domain Whitelist</label>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="example.com"
                  value={newWhitelistDomain}
                  onChange={(e) => setNewWhitelistDomain(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addWhitelistDomain()
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addWhitelistDomain}
                  disabled={!newWhitelistDomain.trim()}
                >
                  <Plus size={16} className="mr-1" />
                  Add
                </Button>
              </div>
              {domainRules.whitelist.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  {domainRules.whitelist.map((domain) => (
                    <span
                      key={domain}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                    >
                      {domain}
                      <button
                        type="button"
                        onClick={(e) => removeWhitelistDomain(domain, e)}
                        className="ml-1 hover:bg-green-200 rounded-full p-0.5 transition-colors cursor-pointer"
                        title="Remove domain"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg">
                  No whitelisted domains. Add domains to allow only specific senders.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Domain Blacklist</label>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="spam.com"
                  value={newBlacklistDomain}
                  onChange={(e) => setNewBlacklistDomain(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addBlacklistDomain()
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addBlacklistDomain}
                  disabled={!newBlacklistDomain.trim()}
                >
                  <Plus size={16} className="mr-1" />
                  Add
                </Button>
              </div>
              {domainRules.blacklist.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  {domainRules.blacklist.map((domain) => (
                    <span
                      key={domain}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium"
                    >
                      {domain}
                      <button
                        type="button"
                        onClick={(e) => removeBlacklistDomain(domain, e)}
                        className="ml-1 hover:bg-red-200 rounded-full p-0.5 transition-colors cursor-pointer"
                        title="Remove domain"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg">
                  No blacklisted domains. Add domains to block specific senders.
                </p>
              )}
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
              <p className="font-medium mb-2">Behavior:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Blacklisted domains are always blocked.</li>
                <li>If whitelist has entries, only those domains are allowed.</li>
                <li>Rejection emails are sent to blocked senders.</li>
              </ul>
            </div>

            <div className="flex space-x-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Domain Rules'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  )
}

