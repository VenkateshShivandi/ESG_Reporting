import { FileItem, ProcessedFileResult } from '@/lib/types/documents'

// Simulated delay to mimic API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock database for files and folders
let mockFiles: FileItem[] = []

export const mockApi = {
  // List files in a directory
  listFiles: async (path: string[]): Promise<FileItem[]> => {
    console.log('📞 Mock API Call - listFiles:', { path })
    await delay(800)
    return mockFiles.filter(file => 
      JSON.stringify(file.path) === JSON.stringify(path)
    )
  },

  // Upload file
  uploadFile: async (file: File, path: string[]): Promise<{ fileId: string }> => {
    console.log('📞 Mock API Call - uploadFile:', { fileName: file.name, size: file.size, path })
    await delay(1000)
    const fileId = Math.random().toString(36).substring(7)
    
    // Add file to mock database
    const newFile: FileItem = {
      id: fileId,
      name: file.name,
      type: 'file',
      size: file.size,
      modified: new Date(),
      path: path,
      file: file,
      processing: false,
      processed: false
    }
    mockFiles.push(newFile)
    console.log('📄 File added to mock DB:', newFile)
    
    return { fileId }
  },

  // Process file
  processFile: async (file: File): Promise<ProcessedFileResult> => {
    console.log('📞 Mock API Call - processFile:', { fileName: file.name, type: file.type })
    await delay(1500)
    
    // Find the file in mock database
    const mockFile = mockFiles.find(f => f.file === file)
    if (!mockFile) {
      throw new Error('File not found in database')
    }

    // Generate processing result
    const fileType = file.name.split('.').pop()?.toLowerCase()
    const baseResult = {
      type: fileType || 'unknown',
      filename: file.name,
      size: file.size,
      processed_at: new Date().toISOString(),
    }

    let result: ProcessedFileResult
    switch (fileType) {
      case 'pdf':
        result = {
          ...baseResult,
          pages: Math.floor(Math.random() * 50) + 1,
          metadata: {
            title: 'Sample PDF Document',
            author: 'ESG Reporter',
            creation_date: new Date().toISOString(),
          },
          preview: 'Sample PDF content...',
        }
        break
      case 'xlsx':
      case 'csv':
        result = {
          ...baseResult,
          rows: Math.floor(Math.random() * 1000) + 1,
          columns: Math.floor(Math.random() * 10) + 5,
          column_names: ['Date', 'Metric', 'Value', 'Unit'],
          sample_data: [
            { Date: '2024-01-01', Metric: 'CO2 Emissions', Value: '150', Unit: 'tons' },
            { Date: '2024-01-02', Metric: 'Energy Usage', Value: '2500', Unit: 'kWh' },
          ],
        }
        break
      default:
        result = baseResult
    }

    // Update file in mock database
    mockFile.processing = false
    mockFile.processed = true
    mockFile.processingResult = result
    console.log('📄 File processing result added to mock DB:', { fileId: mockFile.id, result })

    return result
  },

  // Delete file or folder
  deleteFile: async (itemId: string): Promise<{ status: number, message: string }> => {
    console.log('📞 Mock API Call - deleteFile:', { itemId })
    await delay(500)
    
    // Find the item to be deleted
    const itemToDelete = mockFiles.find(item => item.id === itemId)
    if (!itemToDelete) {
      return { status: 404, message: 'Item not found' }
    }

    if (itemToDelete.type === 'folder') {
      // For folders, also delete all items inside the folder
      const folderPath = [...itemToDelete.path, itemToDelete.name]
      mockFiles = mockFiles.filter(item => {
        const isInFolder = JSON.stringify(item.path).startsWith(JSON.stringify(folderPath))
        const isFolder = item.id === itemId
        return !(isInFolder || isFolder)
      })
      console.log('📁 Folder and its contents deleted from mock DB:', { folderId: itemId, path: folderPath })
    } else {
      // For files, just delete the single item
      mockFiles = mockFiles.filter(file => file.id !== itemId)
      console.log('📄 File deleted from mock DB:', { fileId: itemId })
    }

    return { status: 200, message: 'Item deleted successfully' }
  },

  // Create folder
  createFolder: async (name: string, path: string[]): Promise<{ folderId: string }> => {
    console.log('📞 Mock API Call - createFolder:', { name, path })
    await delay(300)
    const folderId = Math.random().toString(36).substring(7)
    
    // Add folder to mock database
    const newFolder: FileItem = {
      id: folderId,
      name,
      type: 'folder',
      modified: new Date(),
      path,
    }
    mockFiles.push(newFolder)
    console.log('📁 Folder created in mock DB:', newFolder)
    
    return { folderId }
  },

  // Move file or folder
  moveItem: async (itemId: string, newPath: string[]): Promise<{ status: number }> => {
    await delay(600)
    return { status: 200 }
  },

  // Download file
  getDownloadUrl: async (fileId: string): Promise<{ url: string }> => {
    console.log('📞 Mock API Call - getDownloadUrl:', { fileId })
    await delay(400)
    return { url: `mock-download-url-${fileId}` }
  },

  // Update file metadata
  updateFileMetadata: async (
    fileId: string, 
    metadata: Partial<FileItem>
  ): Promise<{ status: number }> => {
    await delay(300)
    return { status: 200 }
  },

  // Search files
  searchFiles: async (
    query: string, 
    filters?: { type?: string; path?: string[] }
  ): Promise<FileItem[]> => {
    await delay(600)
    return mockFiles.filter(file => 
      file.name.toLowerCase().includes(query.toLowerCase())
    )
  },

  // Get file details
  getFileDetails: async (fileId: string): Promise<FileItem | null> => {
    await delay(400)
    const file = mockFiles.find(f => f.id === fileId)
    return file || null
  },

  // Check storage quota
  getStorageQuota: async (): Promise<{ 
    used: number; 
    total: number; 
    percentage: number 
  }> => {
    await delay(300)
    return {
      used: 1024 * 1024 * 500, // 500MB
      total: 1024 * 1024 * 1000, // 1GB
      percentage: 50
    }
  }
} 