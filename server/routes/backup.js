/**
 * Database Backup and Restore Routes
 * Admin Only - Backup and restore database
 */

import express from 'express'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { protect, admin } from '../middleware/auth.js'
import multer from 'multer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

// All routes require admin access
router.use(protect, admin)

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept JSON files or files with .json extension
    if (file.mimetype === 'application/json' || 
        file.mimetype === 'text/json' ||
        file.originalname.toLowerCase().endsWith('.json')) {
      cb(null, true)
    } else {
      cb(new Error('Only JSON files are allowed'), false)
    }
  }
})

// Backup directory
const BACKUP_DIR = path.join(__dirname, '../backups')
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

// Get all models from mongoose
const getModels = () => {
  const models = {}
  const modelNames = [
    'User', 'Organization', 'Ticket', 'Category', 'Department', 
    'Role', 'SLAPolicy', 'EmailSettings', 'EmailTemplate', 
    'EmailAutomation', 'SSOConfig', 'Logo', 'ApiKey', 'FAQ',
    'ChatSession', 'ChatMessage', 'TeamsConfig'
  ]
  
  modelNames.forEach(modelName => {
    try {
      const model = mongoose.model(modelName)
      if (model) {
        models[modelName] = model
      }
    } catch (err) {
      // Model not registered, skip
    }
  })
  
  return models
}

/**
 * @route   POST /api/backup/create
 * @desc    Create a database backup
 * @access  Private/Admin
 */
router.post('/create', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `backup-${timestamp}`
    const backupPath = path.join(BACKUP_DIR, backupName)
    
    // Create backup directory
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true })
    }
    
    const models = getModels()
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      collections: {}
    }
    
    // Export each collection
    for (const [modelName, model] of Object.entries(models)) {
      try {
        const data = await model.find({}).lean()
        backupData.collections[modelName] = data
        
        // Also save individual collection file
        const collectionFile = path.join(backupPath, `${modelName}.json`)
        fs.writeFileSync(collectionFile, JSON.stringify(data, null, 2))
      } catch (error) {
        console.error(`Error backing up ${modelName}:`, error)
        // Continue with other collections
      }
    }
    
    // Save main backup file
    const mainBackupFile = path.join(backupPath, 'backup.json')
    fs.writeFileSync(mainBackupFile, JSON.stringify(backupData, null, 2))
    
    // Create metadata file
    const metadata = {
      name: backupName,
      timestamp: backupData.timestamp,
      collections: Object.keys(backupData.collections),
      collectionCounts: {}
    }
    
    for (const [modelName, data] of Object.entries(backupData.collections)) {
      metadata.collectionCounts[modelName] = data.length
    }
    
    const metadataFile = path.join(backupPath, 'metadata.json')
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2))
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      backup: {
        name: backupName,
        timestamp: backupData.timestamp,
        collections: Object.keys(backupData.collections),
        collectionCounts: metadata.collectionCounts,
        path: backupPath
      }
    })
  } catch (error) {
    console.error('Backup error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Failed to create backup',
      error: error.message 
    })
  }
})

/**
 * @route   GET /api/backup/list
 * @desc    List all backups
 * @access  Private/Admin
 */
router.get('/list', async (req, res) => {
  try {
    const backups = []
    
    if (fs.existsSync(BACKUP_DIR)) {
      const entries = fs.readdirSync(BACKUP_DIR, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('backup-')) {
          const backupPath = path.join(BACKUP_DIR, entry.name)
          const metadataFile = path.join(backupPath, 'metadata.json')
          
          if (fs.existsSync(metadataFile)) {
            const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'))
            const stats = fs.statSync(backupPath)
            
            backups.push({
              name: metadata.name,
              timestamp: metadata.timestamp,
              collections: metadata.collections,
              collectionCounts: metadata.collectionCounts,
              size: getDirectorySize(backupPath),
              createdAt: stats.birthtime
            })
          }
        }
      }
    }
    
    // Sort by timestamp (newest first)
    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    res.json({
      success: true,
      backups
    })
  } catch (error) {
    console.error('List backups error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Failed to list backups',
      error: error.message 
    })
  }
})

/**
 * @route   GET /api/backup/download/:name
 * @desc    Download a backup as JSON file
 * @access  Private/Admin
 */
router.get('/download/:name', async (req, res) => {
  try {
    const backupName = req.params.name
    const backupPath = path.join(BACKUP_DIR, backupName)
    const mainBackupFile = path.join(backupPath, 'backup.json')
    
    if (!fs.existsSync(mainBackupFile)) {
      return res.status(404).json({ 
        success: false,
        message: 'Backup not found' 
      })
    }
    
    // Send backup file
    const fileName = `${backupName}.json`
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.sendFile(mainBackupFile)
    
  } catch (error) {
    console.error('Download backup error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Failed to download backup',
      error: error.message 
    })
  }
})

/**
 * @route   DELETE /api/backup/:name
 * @desc    Delete a backup
 * @access  Private/Admin
 */
router.delete('/:name', async (req, res) => {
  try {
    const backupName = req.params.name
    const backupPath = path.join(BACKUP_DIR, backupName)
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ 
        success: false,
        message: 'Backup not found' 
      })
    }
    
    // Delete directory recursively
    fs.rmSync(backupPath, { recursive: true, force: true })
    
    res.json({
      success: true,
      message: 'Backup deleted successfully'
    })
  } catch (error) {
    console.error('Delete backup error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete backup',
      error: error.message 
    })
  }
})

/**
 * @route   POST /api/backup/restore
 * @desc    Restore database from backup file
 * @access  Private/Admin
 */
router.post('/restore', async (req, res) => {
  try {
    const { backupName, clearExisting } = req.body
    
    if (!backupName) {
      return res.status(400).json({ 
        success: false,
        message: 'Backup name is required' 
      })
    }
    
    const backupPath = path.join(BACKUP_DIR, backupName)
    const mainBackupFile = path.join(backupPath, 'backup.json')
    
    if (!fs.existsSync(mainBackupFile)) {
      return res.status(404).json({ 
        success: false,
        message: 'Backup file not found' 
      })
    }
    
    // Read backup data
    const backupData = JSON.parse(fs.readFileSync(mainBackupFile, 'utf8'))
    
    // Clear existing data if requested
    if (clearExisting) {
      const models = getModels()
      for (const [modelName, model] of Object.entries(models)) {
        try {
          await model.deleteMany({})
        } catch (error) {
          console.error(`Error clearing ${modelName}:`, error)
        }
      }
    }
    
    // Restore collections
    const models = getModels()
    const restoreResults = {}
    
    for (const [modelName, data] of Object.entries(backupData.collections)) {
      try {
        const model = models[modelName]
        if (model && Array.isArray(data) && data.length > 0) {
          // Remove _id to allow MongoDB to generate new ones if needed
          const cleanData = data.map(item => {
            const { _id, __v, ...rest } = item
            return rest
          })
          
          await model.insertMany(cleanData, { ordered: false })
          restoreResults[modelName] = { 
            success: true, 
            count: cleanData.length 
          }
        }
      } catch (error) {
        console.error(`Error restoring ${modelName}:`, error)
        restoreResults[modelName] = { 
          success: false, 
          error: error.message 
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Database restored successfully',
      results: restoreResults
    })
  } catch (error) {
    console.error('Restore error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Failed to restore backup',
      error: error.message 
    })
  }
})

/**
 * @route   POST /api/backup/upload
 * @desc    Upload and restore from backup file
 * @access  Private/Admin
 */
router.post('/upload', upload.single('backupFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No backup file uploaded' 
      })
    }
    
    // Parse clearExisting from form data (comes as string)
    const clearExisting = req.body.clearExisting === 'true' || req.body.clearExisting === true
    
    // Parse uploaded JSON file
    let backupData
    try {
      backupData = JSON.parse(req.file.buffer.toString('utf8'))
    } catch (error) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid backup file format' 
      })
    }
    
    // Validate backup structure
    if (!backupData.collections || !backupData.timestamp) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid backup file structure' 
      })
    }
    
    // Clear existing data if requested
    if (clearExisting) {
      const models = getModels()
      for (const [modelName, model] of Object.entries(models)) {
        try {
          await model.deleteMany({})
        } catch (error) {
          console.error(`Error clearing ${modelName}:`, error)
        }
      }
    }
    
    // Restore collections
    const models = getModels()
    const restoreResults = {}
    
    for (const [modelName, data] of Object.entries(backupData.collections)) {
      try {
        const model = models[modelName]
        if (model && Array.isArray(data) && data.length > 0) {
          const cleanData = data.map(item => {
            const { _id, __v, ...rest } = item
            return rest
          })
          
          await model.insertMany(cleanData, { ordered: false })
          restoreResults[modelName] = { 
            success: true, 
            count: cleanData.length 
          }
        }
      } catch (error) {
        console.error(`Error restoring ${modelName}:`, error)
        restoreResults[modelName] = { 
          success: false, 
          error: error.message 
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Database restored from uploaded file',
      results: restoreResults
    })
  } catch (error) {
    console.error('Upload restore error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Failed to restore from uploaded file',
      error: error.message 
    })
  }
})

// Helper function to get directory size
function getDirectorySize(dirPath) {
  let totalSize = 0
  try {
    const files = fs.readdirSync(dirPath)
    for (const file of files) {
      const filePath = path.join(dirPath, file)
      const stats = fs.statSync(filePath)
      if (stats.isFile()) {
        totalSize += stats.size
      } else if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath)
      }
    }
  } catch (error) {
    console.error('Error calculating directory size:', error)
  }
  return totalSize
}

export default router

