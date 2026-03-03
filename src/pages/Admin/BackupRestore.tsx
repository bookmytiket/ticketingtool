import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Database, Download, Upload, Trash2, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

export const BackupRestore = () => {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(false)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [restoring, setRestoring] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [clearExisting, setClearExisting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    loadBackups()
  }, [])

  const loadBackups = async () => {
    setLoading(true)
    try {
      const response = await adminAPI.listBackups()
      setBackups(response.backups || [])
    } catch (error) {
      toast.error(error.message || 'Failed to load backups')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    setCreatingBackup(true)
    try {
      const response = await adminAPI.createBackup()
      toast.success('Backup created successfully!')
      await loadBackups()
    } catch (error) {
      toast.error(error.message || 'Failed to create backup')
    } finally {
      setCreatingBackup(false)
    }
  }

  const handleDownloadBackup = async (backupName) => {
    try {
      await adminAPI.downloadBackup(backupName)
      toast.success('Backup downloaded successfully!')
    } catch (error) {
      toast.error(error.message || 'Failed to download backup')
    }
  }

  const handleDeleteBackup = async (backupName) => {
    if (!window.confirm(`Are you sure you want to delete backup "${backupName}"?`)) {
      return
    }

    try {
      await adminAPI.deleteBackup(backupName)
      toast.success('Backup deleted successfully!')
      await loadBackups()
    } catch (error) {
      toast.error(error.message || 'Failed to delete backup')
    }
  }

  const handleRestoreBackup = async (backupName) => {
    const confirmMessage = clearExisting
      ? `WARNING: This will DELETE all existing data and restore from "${backupName}". Are you absolutely sure?`
      : `Restore database from "${backupName}"? This will add data without clearing existing records.`

    if (!window.confirm(confirmMessage)) {
      return
    }

    setRestoring(backupName)
    try {
      await adminAPI.restoreBackup(backupName, clearExisting)
      toast.success('Database restored successfully!')
      setRestoring(null)
      setClearExisting(false)
    } catch (error) {
      toast.error(error.message || 'Failed to restore backup')
      setRestoring(null)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log('File selected:', file.name, file.type, file.size)
      processFile(file)
    } else {
      console.log('No file selected')
    }
  }

  const processFile = (file) => {
    if (!file) return
    
    // More lenient file type checking
    const isJson = file.type === 'application/json' || 
                   file.type === 'text/json' ||
                   file.name.toLowerCase().endsWith('.json')
    
    if (!isJson) {
      toast.error('Please select a JSON backup file (.json)')
      return
    }
    
    setSelectedFile(file)
    toast.success(`File selected: ${file.name}`)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }

  const handleUploadRestore = async () => {
    if (!selectedFile) {
      toast.error('Please select a backup file')
      return
    }

    const confirmMessage = clearExisting
      ? `WARNING: This will DELETE all existing data and restore from uploaded file. Are you absolutely sure?`
      : `Restore database from uploaded file? This will add data without clearing existing records.`

    if (!window.confirm(confirmMessage)) {
      return
    }

    setUploadingFile(true)
    try {
      const result = await adminAPI.uploadBackup(selectedFile, clearExisting)
      toast.success(result.message || 'Database restored from uploaded file!')
      setSelectedFile(null)
      setClearExisting(false)
      // Reset file input
      const fileInput = document.getElementById('backup-file-input')
      if (fileInput) fileInput.value = ''
      // Reload backups list
      await loadBackups()
    } catch (error) {
      console.error('Upload restore error:', error)
      toast.error(error.message || 'Failed to restore from uploaded file')
    } finally {
      setUploadingFile(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Database className="w-8 h-8" />
              Database Backup & Restore
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create backups of your database and restore from previous backups
            </p>
          </div>
        </div>

        {/* Create Backup Section */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Create New Backup
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create a complete backup of all database collections. This includes users, tickets, organizations, and all other data.
            </p>
            <Button
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creatingBackup ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating Backup...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Create Backup
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Upload & Restore Section */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Upload & Restore Backup
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Upload a backup file (JSON format) to restore your database.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Backup File
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex-1 cursor-pointer">
                    <input
                      id="backup-file-input"
                      type="file"
                      accept=".json,application/json,text/json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div
                      className={`flex items-center justify-center px-6 py-4 border-2 border-dashed rounded-xl transition-all duration-300 ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500'
                      } bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="text-center">
                        <Upload className={`mx-auto h-8 w-8 mb-2 transition-colors ${
                          isDragging ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
                        }`} />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          JSON files only
                        </p>
                        {selectedFile && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="clear-existing"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="clear-existing" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Clear existing data before restore (WARNING: This will delete all current data!)
                </label>
              </div>

              <Button
                onClick={handleUploadRestore}
                disabled={!selectedFile || uploadingFile}
                className="bg-green-600 hover:bg-green-700"
              >
                {uploadingFile ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Restore
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Existing Backups Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Existing Backups
              </h2>
              <Button
                onClick={loadBackups}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading backups...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8">
                <Database className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No backups found. Create your first backup above.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {backups.map((backup) => (
                  <div
                    key={backup.name}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {backup.name}
                          </h3>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {formatDistanceToNow(new Date(backup.timestamp))} ago
                          </p>
                          <p>Size: {formatFileSize(backup.size || 0)}</p>
                          <p>
                            Collections: {backup.collections?.length || 0} (
                            {Object.values(backup.collectionCounts || {}).reduce((a, b) => a + b, 0)} records)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleDownloadBackup(backup.name)}
                          size="sm"
                          variant="outline"
                          title="Download backup"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleRestoreBackup(backup.name)}
                          size="sm"
                          variant="outline"
                          disabled={restoring === backup.name}
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                          title="Restore from this backup"
                        >
                          {restoring === backup.name ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => handleDeleteBackup(backup.name)}
                          size="sm"
                          variant="outline"
                          className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                          title="Delete backup"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Warning Section */}
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
          <div className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                  Important Notes
                </h3>
                <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1 list-disc list-inside">
                  <li>Backups include all database collections (users, tickets, organizations, etc.)</li>
                  <li>Restoring with "Clear existing data" will DELETE all current data before restoring</li>
                  <li>Always create a backup before performing a restore operation</li>
                  <li>Backup files are stored on the server in the backups directory</li>
                  <li>Download backups regularly for off-site storage</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

