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
  },
})

// Add auth token to every request
api.interceptors.request.use(async config => {
  try {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('🔑 Using token for API request:', token.slice(0, 20) + '...')
    } else {
      console.warn('⚠️ No token available for API request')
    }
  } catch (error) {
    console.error('Error setting auth header:', error)
  }
  return config
})

// Add these types
export type ChunkResult = {
  success: boolean
  fileId: string
  chunks: number
  originalFile: string
  chunkPaths: string[]
}

export type Chunk = {
  id: string
  title: string
  preview: string
}

export const documentsApi = {
  // List all files in a directory
  listFiles: async (path: string[] = []): Promise<FileItem[]> => {
    try {
      console.log('📞 API Call - listFiles:', { path })
      const response = await api.get('/api/list-tree', {
        params: { path: path.join('/') },
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
  processFile: async (storagePath: string): Promise<ProcessedFileResult> => {
    try {
      console.log('📞 API Call - processFile:', { storagePath })

      const response = await api.post('/api/process-file', {
        storage_path: storagePath,
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
        params: { path: path },
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
      // Clean the folder name to remove any problematic characters
      const cleanName = name.trim()

      // Join the path with forward slashes for Supabase storage
      const pathString = path.length > 0 ? path.join('/') : ''

      console.log('📞 API Call - createFolder:', { name: cleanName, path: pathString })

      const response = await api.post('/api/create-folder', {
        name: cleanName,
        path: pathString,
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
        newPath: newPath.join('/'),
      })
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in moveItem:', error)
      throw error
    }
  },

  // Main rename file/folder method - determines type and calls appropriate method
  renameFile: async (directoryPath: string[], oldName: string, newName: string): Promise<void> => {
    try {
      console.log('🔄 Rename operation requested:', { directoryPath, oldName, newName })

      // Clean the inputs
      const cleanedOldName = oldName.trim()
      const cleanedNewName = newName.trim()

      // Create path strings for determining item type
      const directoryPathStr = directoryPath.join('/')
      const fullPath = directoryPathStr ? `${directoryPathStr}/${cleanedOldName}` : cleanedOldName

      // First, try to list the path - if it succeeds, it's a folder
      console.log('🔍 Checking if item is a folder:', fullPath)
      const { data: folderContents, error: folderError } = await supabase.storage
        .from('documents')
        .list(fullPath)

      const isFolder = !folderError && folderContents !== null
      console.log(`Item "${cleanedOldName}" is determined to be a ${isFolder ? 'folder' : 'file'}`)

      if (isFolder) {
        console.log('📁 Calling renameFolder for:', cleanedOldName)
        return documentsApi.renameFolder(directoryPathStr, cleanedOldName, cleanedNewName)
      } else {
        console.log('📄 Calling renameFileItem for:', cleanedOldName)
        return documentsApi.renameFileItem(directoryPathStr, cleanedOldName, cleanedNewName)
      }
    } catch (error: any) {
      console.error('❌ Error in renameFile:', error)
      throw error
    }
  },

  // Specialized method for renaming a single file
  renameFileItem: async (
    directoryPath: string,
    oldFileName: string,
    newFileName: string
  ): Promise<void> => {
    try {
      // Step 1: Normalize inputs to prevent path issues
      const normalizedDirPath = directoryPath.replace(/^\/+|\/+$/g, '')
      const oldName = oldFileName.trim()
      const newName = newFileName.trim()

      // Step 2: Construct full paths correctly using Supabase path conventions
      // Supabase paths don't have leading slashes but need directory paths
      const oldPath = normalizedDirPath ? `${normalizedDirPath}/${oldName}` : oldName
      const newPath = normalizedDirPath ? `${normalizedDirPath}/${newName}` : newName

      console.log('📄 Rename operation:', {
        directoryPath: normalizedDirPath,
        oldName,
        newName,
        oldPath,
        newPath,
      })

      // Step 3: Directly verify the file exists by attempting to get its metadata
      console.log(`📄 Verifying file existence: ${oldPath}`)
      try {
        // Try to get the file's metadata or at least headers
        const { data: fileMetadata, error: headError } = await supabase.storage
          .from('documents')
          .createSignedUrl(oldPath, 60, { transform: { width: 1 } }) // Just to check existence, not for download

        if (headError) {
          console.error('❌ File existence check failed:', headError)
          throw new Error(`Could not access the file "${oldName}". ${headError.message}`)
        }

        if (!fileMetadata) {
          console.error('❌ File metadata check failed:', 'No metadata returned')
          throw new Error(`Could not verify file "${oldName}". File may not exist.`)
        }

        console.log('✅ File existence verified')
      } catch (verifyError: any) {
        console.error('❌ File verification failed:', verifyError)

        // Second attempt - try to download a small chunk
        try {
          const { data: fileExists, error: downloadError } = await supabase.storage
            .from('documents')
            .download(oldPath)

          if (downloadError || !fileExists) {
            console.error('❌ File existence verification failed:', downloadError)
            throw new Error(
              `Could not access the file "${oldName}". ${downloadError?.message || 'File not found.'}`
            )
          }

          console.log('✅ File existence verified via download')
        } catch (downloadErr) {
          console.error('❌ Second file verification attempt failed:', downloadErr)
          throw new Error(`The file "${oldName}" cannot be accessed. Please refresh and try again.`)
        }
      }

      // Step 4: Check if destination file name already exists
      console.log(`📄 Checking if "${newName}" already exists`)
      let destExists = false
      try {
        const { data: checkData, error: checkError } = await supabase.storage
          .from('documents')
          .createSignedUrl(newPath, 60, { transform: { width: 1 } })

        destExists = !checkError && checkData !== null
      } catch (checkErr) {
        // If we get an error, the destination likely doesn't exist - this is good
        destExists = false
      }

      if (destExists) {
        console.error('❌ Destination file already exists:', newName)
        throw new Error(`A file named "${newName}" already exists in this folder.`)
      }

      console.log('✅ Destination check passed')

      // Step 5: Perform the rename operation
      console.log(`📄 Moving file: ${oldPath} → ${newPath}`)
      const { error: moveError } = await supabase.storage.from('documents').move(oldPath, newPath)

      if (moveError) {
        console.error('❌ Supabase move operation failed:', moveError)

        // If move fails, try the download-upload-delete approach
        console.log('📄 Attempting alternative rename approach via download-upload-delete')

        try {
          // Download the entire file
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('documents')
            .download(oldPath)

          if (downloadError || !fileData) {
            console.error('❌ Failed to download file for alternative rename:', downloadError)
            throw new Error(
              `Could not download the file "${oldName}". ${downloadError?.message || 'Please try again.'}`
            )
          }

          // Upload to new path
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(newPath, fileData, { upsert: false })

          if (uploadError) {
            console.error('❌ Failed to upload file with new name:', uploadError)
            throw new Error(`Failed to save file with the new name. ${uploadError.message}`)
          }

          // Delete the original after successful upload
          const { error: deleteError } = await supabase.storage.from('documents').remove([oldPath])

          if (deleteError) {
            console.warn('⚠️ Created new file but failed to delete original:', deleteError)
            // Don't throw here - the rename technically succeeded but original remains
            console.log('⚠️ File renamed but original copy remains')
          } else {
            console.log('✅ Alternative rename approach succeeded')
          }
        } catch (altError: any) {
          console.error('❌ Alternative rename approach failed:', altError)
          throw new Error(
            `Rename operation failed. ${altError.message || 'Please try again later.'}`
          )
        }
      } else {
        console.log('✅ File rename operation completed successfully!')
      }
    } catch (error: any) {
      console.error('❌ Error in renameFileItem:', error)
      throw error
    }
  },

  // Specialized method for renaming a folder
  renameFolder: async (
    parentPath: string,
    oldFolderName: string,
    newFolderName: string
  ): Promise<void> => {
    // Initialize variables at the function level so they're available in the catch block
    let oldFolderPath = ''
    let newFolderPath = ''

    try {
      console.log('📁 Starting folder rename operation:', {
        parentPath,
        oldFolderName,
        newFolderName,
      })

      // Normalize path handling
      const normalizedParentPath = parentPath.replace(/^\/+|\/+$/g, '')

      // Construct full paths for source and destination folders
      oldFolderPath = normalizedParentPath
        ? `${normalizedParentPath}/${oldFolderName}`
        : oldFolderName
      newFolderPath = normalizedParentPath
        ? `${normalizedParentPath}/${newFolderName}`
        : newFolderName

      console.log('📁 Constructed paths:', { oldFolderPath, newFolderPath })

      // 1. Verify source folder exists by checking .folder file
      const { error: sourceCheckError } = await supabase.storage
        .from('documents')
        .download(`${oldFolderPath}/.folder`)

      if (sourceCheckError) {
        console.error('❌ Source folder verification failed:', sourceCheckError)
        throw new Error(`Could not access folder "${oldFolderName}". ${sourceCheckError.message}`)
      }

      // 2. Check if destination already exists
      const { error: destCheckError } = await supabase.storage
        .from('documents')
        .download(`${newFolderPath}/.folder`)

      if (!destCheckError) {
        throw new Error(`A folder named "${newFolderName}" already exists.`)
      }

      // 3. Move the .folder file first to mark new location
      console.log('📁 Moving .folder file')
      const { error: folderMoveError } = await supabase.storage
        .from('documents')
        .move(`${oldFolderPath}/.folder`, `${newFolderPath}/.folder`)

      if (folderMoveError) {
        console.error('❌ Failed to move .folder file:', folderMoveError)
        throw new Error(`Could not rename folder. ${folderMoveError.message}`)
      }

      // 4. List and move remaining files (if any)
      console.log('📁 Moving remaining folder contents')
      let cursor: string | null = null
      const movedItems: string[] = []
      const failedItems: string[] = []

      do {
        const { data: files, error: listError } = await supabase.storage
          .from('documents')
          .list(oldFolderPath, { limit: 100 })

        if (listError) {
          console.error('❌ Failed to list folder contents:', listError)
          throw new Error(`Could not access folder contents. ${listError.message}`)
        }

        // Skip the .folder file since we already moved it
        const filesToMove = files?.filter(f => f.name !== '.folder') || []

        for (const file of filesToMove) {
          const oldPath = `${oldFolderPath}/${file.name}`
          const newPath = `${newFolderPath}/${file.name}`

          try {
            const { error: moveError } = await supabase.storage
              .from('documents')
              .move(oldPath, newPath)

            if (moveError) {
              console.error(`❌ Failed to move ${file.name}:`, moveError)
              failedItems.push(file.name)
            } else {
              movedItems.push(file.name)
            }
          } catch (error: any) {
            console.error(`❌ Error moving ${file.name}:`, error)
            failedItems.push(file.name)
          }
        }

        cursor = files?.length === 100 ? files[99].name : null
      } while (cursor)

      // 5. Cleanup old folder if empty
      const { data: remainingFiles } = await supabase.storage.from('documents').list(oldFolderPath)

      if (remainingFiles && remainingFiles.length === 0) {
        await supabase.storage.from('documents').remove([oldFolderPath])
      }

      // 6. Report results
      if (failedItems.length > 0) {
        console.warn(`⚠️ Some items failed to move: ${failedItems.join(', ')}`)
        throw new Error(
          `Folder rename partially completed. ${failedItems.length} items failed to move.`
        )
      }

      console.log('✅ Folder rename completed successfully!', {
        movedItems: movedItems.length,
        failedItems: failedItems.length,
      })
    } catch (error: any) {
      console.error('❌ Error in renameFolder:', error)

      // Attempt to rollback .folder file move
      try {
        await supabase.storage
          .from('documents')
          .move(`${newFolderPath}/.folder`, `${oldFolderPath}/.folder`)
      } catch (rollbackError) {
        console.error('❌ Critical: Failed to rollback .folder file:', rollbackError)
      }

      throw error
    }
  },

  // Function to get a download URL for a file
  getDownloadUrl: async (fileId: string): Promise<{ url: string }> => {
    try {
      console.log('📞 API Call - getDownloadUrl:', { fileId })

      // Check if fileId is a full path - we need the path to use createSignedUrl
      let filePath = fileId

      // Use Supabase directly to create a signed URL
      // The filePath/fileId should be the relative path within the bucket
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600, { download: false }) // 1 hour expiration, explicitly set download: false

      if (error) {
        console.error('❌ Supabase Error in getDownloadUrl:', error)
        throw error
      }

      if (!data || !data.signedUrl) {
        console.error('❌ No signed URL returned from Supabase')
        throw new Error('Failed to get download URL: No signed URL returned')
      }

      console.log('📥 Supabase Response:', { signedUrl: data.signedUrl.substring(0, 50) + '...' })
      return { url: data.signedUrl }
    } catch (error) {
      console.error('❌ API Error in getDownloadUrl:', error)

      // Try fallback approach - get a public URL instead if supported
      try {
        console.log('Attempting fallback to get public URL...')
        const { data } = supabase.storage.from('documents').getPublicUrl(fileId)

        if (data && data.publicUrl) {
          console.log('📥 Fallback successful - using public URL')
          return { url: data.publicUrl }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError)
      }

      throw error
    }
  },

  // Update file metadata
  updateFileMetadata: async (
    fileId: string,
    metadata: Partial<FileItem>
  ): Promise<{ status: number }> => {
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
        newName,
      })
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in renameItem:', error)
      throw error
    }
  },

  // Search for files
  searchFiles: async (
    query: string,
    filters?: { type?: string; path?: string[] }
  ): Promise<FileItem[]> => {
    try {
      console.log('📞 API Call - searchFiles:', { query, filters })
      const response = await api.get('/api/search-files', {
        params: {
          query,
          type: filters?.type,
          path: filters?.path?.join('/'),
        },
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
  },

  // Add these functions to the documentsApi object
  createChunks: async (filePath: string): Promise<ChunkResult> => {
    try {
      console.log('📞 API Call - createChunks:', { filePath })
      const response = await api.post('/api/chunk-file', { filePath })
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in createChunks:', error)
      throw error
    }
  },

  listChunks: async (fileId: string): Promise<{ chunks: Chunk[]; totalChunks: number }> => {
    try {
      console.log('📞 API Call - listChunks:', { fileId })
      const response = await api.get(`/api/chunks/${fileId}`)
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in listChunks:', error)
      throw error
    }
  },

  getChunk: async (fileId: string, chunkId: string): Promise<{ text: string; title: string }> => {
    try {
      console.log('📞 API Call - getChunk:', { fileId, chunkId })
      const response = await api.get(`/api/chunks/${fileId}/${chunkId}`)
      console.log('📥 API Response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ API Error in getChunk:', error)
      throw error
    }
  },
}
