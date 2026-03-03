import { useState } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { ticketsAPI } from '../../services/api'
import toast from 'react-hot-toast'

export const TicketImport = () => {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)
  const [jsonData, setJsonData] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const processFile = (selectedFile) => {
    if (!selectedFile) return

      if (selectedFile.type === 'application/json' || selectedFile.name.endsWith('.json')) {
        setFile(selectedFile)
        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result)
            setJsonData(JSON.stringify(data, null, 2))
          } catch (error) {
            toast.error('Invalid JSON file')
            setFile(null)
          }
        }
        reader.readAsText(selectedFile)
      } else if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile)
      } else {
        toast.error('Please select a CSV or JSON file')
        setFile(null)
      }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    processFile(selectedFile)
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

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0]
      processFile(droppedFile)
    }
  }

  const handleImport = async () => {
    if (!file && !jsonData.trim()) {
      toast.error('Please select a file or paste JSON data')
      return
    }

    try {
      setImporting(true)
      setImportResults(null)

      let dataToImport = []
      
      if (jsonData.trim()) {
        try {
          dataToImport = JSON.parse(jsonData)
          if (!Array.isArray(dataToImport)) {
            dataToImport = [dataToImport]
          }
        } catch (error) {
          toast.error('Invalid JSON format')
          setImporting(false)
          return
        }
      } else if (file) {
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          const text = await file.text()
          dataToImport = JSON.parse(text)
          if (!Array.isArray(dataToImport)) {
            dataToImport = [dataToImport]
          }
        } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          const text = await file.text()
          dataToImport = parseCSV(text)
        }
      }

      const result = await ticketsAPI.importTickets(dataToImport)
      setImportResults(result)
      toast.success(`Successfully imported ${result.success} tickets`)
      
      if (result.errors && result.errors.length > 0) {
        toast.error(`${result.errors.length} tickets failed to import`)
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error(error.message || 'Failed to import tickets')
    } finally {
      setImporting(false)
    }
  }

  // Parse CSV with proper handling of quoted fields
  const parseCSVLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"'
          i++ // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    // Add last field
    result.push(current.trim())
    return result
  }

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase())
    const tickets = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim())
      if (values.length !== headers.length) continue

      const ticket = {}
      headers.forEach((header, index) => {
        ticket[header] = values[index]
      })

      // Map CSV columns to ticket fields
      tickets.push({
        ticketId: ticket.ticketid || ticket.id,
        title: ticket.title || ticket.subject,
        description: ticket.description || ticket.body || '',
        category: ticket.category || 'General',
        priority: ticket.priority || 'medium',
        status: ticket.status || 'open',
        createdAt: ticket.createdat || ticket.created || new Date().toISOString(),
        dueDate: ticket.duedate || ticket.due || null,
      })
    }

    return tickets
  }

  const downloadJSONTemplate = () => {
    const template = [
      {
        ticketId: 1001,
        title: 'Sample Ticket Title',
        description: 'Sample ticket description',
        category: 'IT Support',
        priority: 'medium',
        status: 'open',
        createdAt: new Date().toISOString(),
        dueDate: null,
      },
      {
        ticketId: 1002,
        title: 'Another Sample Ticket',
        description: 'Another sample ticket description',
        category: 'General',
        priority: 'high',
        status: 'in-progress',
        createdAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      }
    ]

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ticket-import-template.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('JSON template downloaded')
  }

  const downloadCSVTemplate = () => {
    // CSV headers matching the parseCSV function expectations
    const headers = [
      'ticketId',
      'title',
      'description',
      'category',
      'priority',
      'status',
      'createdAt',
      'dueDate'
    ]
    
    // Sample data rows
    const rows = [
      [
        '1001',
        'Sample Ticket Title',
        'Sample ticket description',
        'IT Support',
        'medium',
        'open',
        new Date().toISOString(),
        ''
      ],
      [
        '1002',
        'Another Sample Ticket',
        'Another sample ticket description',
        'General',
        'high',
        'in-progress',
        new Date().toISOString(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      ]
    ]

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // Escape commas and quotes in CSV cells
          const cellStr = String(cell || '')
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ticket-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV template downloaded')
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-primary-700 to-gray-900 bg-clip-text text-transparent mb-1">
              Import Tickets
            </h1>
            <p className="text-sm text-gray-600">Import tickets from external ticketing systems</p>
          </div>
          <div className="flex gap-3">
            <Button
              transparent
              variant="outline"
              onClick={downloadCSVTemplate}
              className="animate-scale-in"
            >
              <Download size={20} className="mr-2" />
              Download CSV Template
            </Button>
            <Button
              transparent
              variant="outline"
              onClick={downloadJSONTemplate}
              className="animate-scale-in"
            >
              <Download size={20} className="mr-2" />
              Download JSON Template
            </Button>
          </div>
        </div>

        <Card className="animate-slide-down">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Import from File</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload a CSV or JSON file containing ticket data. The system will automatically continue the ticket ID sequence.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-xs text-blue-800 font-semibold mb-2">📋 Supported Formats:</p>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>CSV Format:</strong> First row must contain headers: <code className="bg-blue-100 px-1 rounded">ticketId, title, description, category, priority, status, createdAt, dueDate</code></p>
                  <p><strong>JSON Format:</strong> Array of ticket objects with fields: <code className="bg-blue-100 px-1 rounded">ticketId, title, description, category, priority, status, createdAt, dueDate</code></p>
                  <p className="mt-2"><strong>Note:</strong> Download templates above to see the exact format with sample data.</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <div
                    className={`flex items-center justify-center px-6 py-4 border-2 border-dashed rounded-xl transition-all duration-300 ${
                      isDragging
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300 hover:border-primary-500'
                    } bg-white/50 backdrop-blur-sm hover:bg-white/80`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="text-center">
                      <Upload
                        className={`mx-auto h-8 w-8 mb-2 transition-colors ${
                          isDragging ? 'text-primary-500' : 'text-gray-400'
                        }`}
                      />
                      <span className="text-sm text-gray-600">
                        {file ? file.name : 'Click to upload or drag and drop'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        CSV or JSON files only
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Or Paste JSON Data</h2>
              <p className="text-sm text-gray-600 mb-4">
                Paste ticket data in JSON format directly
              </p>
              <textarea
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                placeholder='[{"ticketId": 1001, "title": "Ticket Title", "description": "Description", "category": "IT Support", "priority": "medium", "status": "open"}]'
                className="w-full h-48 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="flex justify-end">
              <Button
                transparent
                onClick={handleImport}
                disabled={importing || (!file && !jsonData.trim())}
                className="min-w-[120px]"
              >
                {importing ? (
                  <>
                    <div className="animate-spin mr-2">⟳</div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={20} className="mr-2" />
                    Import Tickets
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {importResults && (
          <Card className="animate-slide-down">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Import Results</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={20} />
                <span className="font-medium">Successfully imported: {importResults.success} tickets</span>
              </div>
              {importResults.errors && importResults.errors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <AlertCircle size={20} />
                    <span className="font-medium">Failed to import: {importResults.errors.length} tickets</span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <ul className="space-y-2 text-sm">
                      {importResults.errors.map((error, index) => (
                        <li key={index} className="text-red-700">
                          <strong>Ticket {error.ticketId || index + 1}:</strong> {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}

