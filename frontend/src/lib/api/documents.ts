import { FileItem, ProcessedFileResult } from '@/lib/types/documents'
import { mockApi } from './mock/documents'

// Export the mock API for now - will be replaced with real Supabase implementation
export const documentsApi = {
  // List all files in a directory
  listFiles: async (path: string[] = []): Promise<FileItem[]> => {
    return mockApi.listFiles(path)
  },

  // Upload and process a file
  uploadFile: async (file: File, path: string[] = []): Promise<{ fileId: string }> => {
    // First upload the file
    const { fileId } = await mockApi.uploadFile(file, path)
    return { fileId }
  },

  // Process a file to extract metadata and content
  processFile: async (file: File): Promise<ProcessedFileResult> => {
    return mockApi.processFile(file)
  },

  // Delete a file or folder
  deleteFile: async (fileId: string): Promise<{ status: number; message: string }> => {
    return mockApi.deleteFile(fileId)
  },

  // Create a new folder
  createFolder: async (name: string, path: string[] = []): Promise<{ folderId: string }> => {
    return mockApi.createFolder(name, path)
  },

  // Move a file or folder to a new location
  moveItem: async (itemId: string, newPath: string[]): Promise<{ status: number }> => {
    return mockApi.moveItem(itemId, newPath)
  },

  // Get a download URL for a file
  getDownloadUrl: async (fileId: string): Promise<{ url: string }> => {
    return mockApi.getDownloadUrl(fileId)
  },

  // Update file metadata
  updateFileMetadata: async (fileId: string, metadata: Partial<FileItem>): Promise<{ status: number }> => {
    return mockApi.updateFileMetadata(fileId, metadata)
  },

  // Search for files
  searchFiles: async (query: string, filters?: { type?: string; path?: string[] }): Promise<FileItem[]> => {
    return mockApi.searchFiles(query, filters)
  },

  // Get detailed information about a file
  getFileDetails: async (fileId: string): Promise<FileItem | null> => {
    return mockApi.getFileDetails(fileId)
  },

  // Get storage quota information
  getStorageQuota: async (): Promise<{ used: number; total: number; percentage: number }> => {
    return mockApi.getStorageQuota()
  }
} 