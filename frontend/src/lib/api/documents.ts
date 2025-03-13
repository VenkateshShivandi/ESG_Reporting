import { FileItem, ProcessedFileResult, RenameItemResponse } from '@/lib/types/documents'
import axios from 'axios'
import supabase from '@/lib/supabase/client'

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

// Create axios instance with default config
const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Add auth token to every request
api.interceptors.request.use(async (config) => {
  try {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log("🔑 Using token for API request:", token.slice(0, 20) + "...")
    } else {
      console.warn("⚠️ No token available for API request")
    }
  } catch (error) {
    console.error("Error setting auth header:", error)
  }
  return config
})

export const documentsApi = {
  // List all files in a directory
  listFiles: async (path: string[] = []): Promise<FileItem[]> => {
    try {
      console.log('📞 API Call - listFiles:', { path })
      const response = await api.get('/api/list-tree', {
        params: { path: path.join('/') }
      })
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in listFiles:', error)
      throw error
    }
  },

  // Upload and process a file
  uploadFile: async (file: File, path: string[] = []): Promise<{ fileId: string }> => {
    try {
      console.log('📞 API Call - uploadFile:', { fileName: file.name, path })
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', path.join('/'))

      const response = await api.post('/api/upload-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in uploadFile:', error)
      throw error
    }
  },

  // Process a file to extract metadata and content
  processFile: async (file: File): Promise<ProcessedFileResult> => {
    try {
      console.log('📞 API Call - processFile:', { fileName: file.name })
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/api/process-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in processFile:', error)
      throw error
    }
  },

  // Delete a file or folder
  deleteFile: async (path: string): Promise<{ success: boolean; path: string }> => {
    try {
      console.log('📞 API Call - deleteFile:', { path })
      const response = await api.delete('/api/delete', {
        params: { path: path }
      })
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in deleteFile:', error)
      throw error
    }
  },

  // Create a new folder
  createFolder: async (name: string, path: string[] = []): Promise<{ folderId: string }> => {
    try {
      console.log('📞 API Call - createFolder:', { name, path })
      const response = await api.post('/api/create-folder', {
        name,
        path: path.join('/')
      })
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in createFolder:', error)
      throw error
    }
  },

  // Move a file or folder to a new location
  moveItem: async (itemId: string, newPath: string[]): Promise<{ status: number }> => {
    try {
      console.log('📞 API Call - moveItem:', { itemId, newPath })
      const response = await api.post('/api/move-item', {
        itemId,
        newPath: newPath.join('/')
      })
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in moveItem:', error)
      throw error
    }
  },

  // Get a download URL for a file
  getDownloadUrl: async (fileId: string): Promise<{ url: string }> => {
    try {
      console.log('📞 API Call - getDownloadUrl:', { fileId })
      const response = await api.get(`/api/files/${fileId}/download`)
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in getDownloadUrl:', error)
      throw error
    }
  },

  // Update file metadata
  updateFileMetadata: async (fileId: string, metadata: Partial<FileItem>): Promise<{ status: number }> => {
    try {
      console.log('📞 API Call - updateFileMetadata:', { fileId, metadata })
      const response = await api.patch(`/api/files/${fileId}`, metadata)
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in updateFileMetadata:', error)
      throw error
    }
  },

  // Rename file or folder
  renameItem: async (oldPath: string, newName: string): Promise<RenameItemResponse> => {
    try {
      console.log('📞 API Call - renameItem:', { oldPath, newName })
      const response = await api.post('/api/rename', {
        oldPath,
        newName
      })
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in renameItem:', error)
      throw error
    }
  },

  // Search for files
  searchFiles: async (query: string, filters?: { type?: string; path?: string[] }): Promise<FileItem[]> => {
    try {
      console.log('📞 API Call - searchFiles:', { query, filters })
      const response = await api.get('/api/search-files', {
        params: {
          query,
          type: filters?.type,
          path: filters?.path?.join('/')
        }
      })
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in searchFiles:', error)
      throw error
    }
  },

  // Get detailed information about a file
  getFileDetails: async (fileId: string): Promise<FileItem | null> => {
    try {
      console.log('📞 API Call - getFileDetails:', { fileId })
      const response = await api.get(`/api/files/${fileId}/details`)
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in getFileDetails:', error)
      throw error
    }
  },

  // Get storage quota information
  getStorageQuota: async (): Promise<{ used: number; total: number; percentage: number }> => {
    try {
      console.log('📞 API Call - getStorageQuota')
      const response = await api.get('/api/storage-quota')
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in getStorageQuota:', error)
      throw error
    }
  }
} 