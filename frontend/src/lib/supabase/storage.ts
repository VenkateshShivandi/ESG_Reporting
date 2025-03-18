import { createClient } from "@supabase/supabase-js"
import * as Sentry from "@sentry/nextjs"
import type { FileItem, FileUploadResponse } from "@/lib/types/documents"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const BUCKET_NAME = "documents"

export async function uploadFile(
  file: File,
  path: string,
  onProgress?: (progress: number) => void,
): Promise<FileUploadResponse> {
  try {
    // Normalize path by removing leading and trailing slashes
    const normalizedPath = path.replace(/^\/+|\/+$/g, '')
    
    // Construct file path, ensuring proper joining with slashes
    const filePath = normalizedPath ? `${normalizedPath}/${file.name}` : file.name
    
    console.log(`📤 Uploading file to ${filePath}`)

    // For upload, we need the file data as a Blob or File object
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, {
      cacheControl: "3600",
      upsert: true, // Allow overwriting files
      contentType: file.type || undefined
    })

    if (error) {
      console.error(`❌ Upload error:`, error)
      throw error
    }

    if (!data || !data.path) {
      console.error(`❌ Upload failed: No data returned`)
      throw new Error('Upload failed: No data returned from Supabase')
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path)

    console.log(`✅ File uploaded successfully to ${data.path}`)
    return {
      path: data.path,
      url: urlData.publicUrl,
    }
  } catch (error) {
    console.error(`❌ File upload failed:`, error)
    Sentry.captureException(error)
    throw error
  }
}

export async function deleteFile(path: string): Promise<void> {
  try {
    // Normalize path by removing leading and trailing slashes
    const normalizedPath = path.replace(/^\/+|\/+$/g, '')
    
    console.log(`🗑️ Deleting file at ${normalizedPath}`)
    
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([normalizedPath])

    if (error) {
      console.error(`❌ Delete error:`, error)
      throw error
    }
    
    console.log(`✅ File deleted successfully: ${normalizedPath}`)
  } catch (error) {
    console.error(`❌ Delete operation failed:`, error)
    Sentry.captureException(error)
    throw error
  }
}

export async function createFolder(path: string): Promise<void> {
  try {
    // Normalize path by removing leading and trailing slashes
    const normalizedPath = path.replace(/^\/+|\/+$/g, '')
    
    console.log(`📁 Creating folder at ${normalizedPath}`)
    
    // Check if folder already exists by trying to list it
    const { data, error: listError } = await supabase.storage.from(BUCKET_NAME).list(normalizedPath)
    
    // If we can successfully list the path, it already exists
    if (!listError && Array.isArray(data)) {
      console.log(`📁 Folder already exists at ${normalizedPath}`)
      return
    }
    
    // Create the folder placeholder - using .folder as seen in the screenshot
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(
      `${normalizedPath}/.folder`, 
      new Blob(['folder'], { type: 'application/x-directory' })
    )

    if (error) {
      if (error.message && (error.message.includes('duplicate') || error.message.includes('already exists'))) {
        console.log(`📁 Folder already exists at ${normalizedPath}`)
        return
      }
      
      console.error(`❌ Create folder error:`, error)
      throw error
    }
    
    console.log(`✅ Folder created successfully at ${normalizedPath}`)
  } catch (error) {
    console.error(`❌ Create folder operation failed:`, error)
    Sentry.captureException(error)
    throw error
  }
}

export async function listFiles(path: string): Promise<FileItem[]> {
  try {
    // Normalize path by removing leading and trailing slashes
    const normalizedPath = path.replace(/^\/+|\/+$/g, '')
    
    console.log(`📋 Listing files in ${normalizedPath || 'root'}`)
    
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list(normalizedPath, {
      sortBy: { column: 'name', order: 'asc' }
    })

    if (error) {
      console.error(`❌ List files error:`, error)
      throw error
    }
    
    if (!data || !Array.isArray(data)) {
      console.warn(`⚠️ No files found or invalid response`)
      return []
    }

    console.log(`✅ Found ${data.length} items in ${normalizedPath || 'root'}`)
    
    // Convert to consistent FileItem objects
    return data.map((item) => {
      // Check if item is a folder (id is null or name is .folder or no mimetype)
      const isFolder = item.id === null || !item.metadata?.mimetype
        
      // Construct the full path for public URL generation
      const fullPath = normalizedPath ? `${normalizedPath}/${item.name}` : item.name
      
      return {
        id: item.id || `folder-${item.name}`,
      name: item.name,
        type: isFolder ? "folder" : "file",
      size: item.metadata?.size,
      modified: new Date(item.created_at),
        path: normalizedPath ? normalizedPath.split("/").filter(Boolean) : [],
        url: !isFolder
          ? supabase.storage.from(BUCKET_NAME).getPublicUrl(fullPath).data.publicUrl
        : undefined,
      metadata: item.metadata,
      }
    })
  } catch (error) {
    console.error(`❌ List files operation failed:`, error)
    Sentry.captureException(error)
    throw error
  }
}

export async function isFolder(path: string): Promise<boolean> {
  try {
    // Normalize path by removing leading and trailing slashes
    const normalizedPath = path.replace(/^\/+|\/+$/g, '')
    
    // Try to list the contents of the path
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list(normalizedPath)
    
    // If there's no error and data is returned, it's a folder
    return !error && Array.isArray(data)
  } catch (error) {
    console.error(`❌ Error checking if path is a folder:`, error)
    return false
  }
}

export const renameFile = async (oldPath: string, newPath: string) => {
  // Ensure we're using the correct bucket name
  const { data, error } = await supabase.storage
    .from('documents')
    .move(oldPath, newPath);

  if (error) {
    throw error;
  }
  return data;
};

export async function deleteFolder(folderPath: string): Promise<void> {
  try {
    // Normalize path by removing leading and trailing slashes
    const normalizedPath = folderPath.replace(/^\/+|\/+$/g, '')
    
    console.log(`🗑️ Deleting folder at ${normalizedPath}`)
    
    // List all files in the folder
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list(normalizedPath)
    
    if (error) {
      console.error(`❌ Error listing folder contents for deletion:`, error)
      throw error
    }
    
    if (!data || !Array.isArray(data)) {
      console.warn(`⚠️ No files found in folder to delete`)
      return
    }
    
    // Track files to delete
    let filesToDelete = []
    
    // First collect all file paths that need to be deleted
    for (const item of data) {
      const itemPath = `${normalizedPath}/${item.name}`
      
      if (item.name === '.folder') {
        // This is the folder placeholder
        filesToDelete.push(itemPath)
      } else if (!item.metadata?.mimetype) {
        // This is a subfolder, recursively delete its contents
        await deleteFolder(itemPath)
      } else {
        // This is a file
        filesToDelete.push(itemPath)
      }
    }
    
    // Delete all files in one batch if possible
    if (filesToDelete.length > 0) {
      console.log(`🗑️ Deleting ${filesToDelete.length} items in folder ${normalizedPath}`)
      
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(filesToDelete)
      
      if (deleteError) {
        console.error(`❌ Error deleting files in folder:`, deleteError)
        throw deleteError
      }
    }
    
    console.log(`✅ Folder deleted successfully: ${normalizedPath}`)
  } catch (error) {
    console.error(`❌ Delete folder operation failed:`, error)
    Sentry.captureException(error)
    throw error
  }
}

export async function renameFolder(oldFolderPath: string, newFolderPath: string): Promise<void> {
  try {
    // Normalize paths by removing leading and trailing slashes
    const normalizedOldPath = oldFolderPath.replace(/^\/+|\/+$/g, '')
    const normalizedNewPath = newFolderPath.replace(/^\/+|\/+$/g, '')
    
    console.log(`🔄 Renaming folder from ${normalizedOldPath} to ${normalizedNewPath}`)
    
    // First check if old folder exists
    const { data: oldFolderData, error: oldFolderError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(normalizedOldPath)
    
    if (oldFolderError) {
      console.error(`❌ Source folder not found:`, oldFolderError)
      throw new Error(`Source folder not found: ${normalizedOldPath}`)
    }
    
    // Check if new folder already exists to avoid conflicts
    const { data: newFolderData, error: newFolderError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(normalizedNewPath)
    
    // Only proceed if the new folder doesn't exist or the error is because it doesn't exist
    if (!newFolderError && newFolderData && newFolderData.length > 0) {
      console.error(`❌ Destination folder already exists: ${normalizedNewPath}`)
      throw new Error(`Destination folder already exists: ${normalizedNewPath}`)
    }
    
    // Create destination folder first
    await createFolder(normalizedNewPath)
    
    // Get all files in the original folder (recursive)
    const allFiles = await getAllFilesInFolder(normalizedOldPath)
    
    if (allFiles.length === 0) {
      console.log(`ℹ️ No files to move in folder: ${normalizedOldPath}`)
    }
    
    // Track success and failures
    let successCount = 0
    let failureCount = 0
    
    // Move each file individually
    for (const filePath of allFiles) {
      // Calculate new path for the file
      const relativePath = filePath.slice(normalizedOldPath.length + 1) // +1 for the trailing slash
      const newFilePath = `${normalizedNewPath}/${relativePath}`
      
      try {
        const { error: moveError } = await supabase.storage
          .from(BUCKET_NAME)
          .move(filePath, newFilePath)
        
        if (moveError) {
          console.error(`❌ Error moving file ${filePath}:`, moveError)
          failureCount++
        } else {
          successCount++
        }
      } catch (moveError) {
        console.error(`❌ Exception moving file ${filePath}:`, moveError)
        failureCount++
      }
    }
    
    // Delete original folder placeholder
    try {
      await deleteFile(`${normalizedOldPath}/.folder`)
    } catch (error: any) {
      console.warn(`⚠️ Could not delete original folder placeholder: ${error.message}`)
    }
    
    console.log(`✅ Folder rename operation completed: ${successCount} files moved, ${failureCount} failed`)
    
    if (failureCount > 0) {
      throw new Error(`Folder rename partially completed: ${failureCount} files failed to move`)
    }
  } catch (error) {
    console.error(`❌ Folder rename operation failed:`, error)
    Sentry.captureException(error)
    throw error
  }
}

// Helper function to recursively get all files in a folder
async function getAllFilesInFolder(folderPath: string): Promise<string[]> {
  const results: string[] = []
  
  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folderPath)
    
    if (error) {
      console.error(`❌ Error listing folder contents:`, error)
      throw error
    }
    
    if (!data || !Array.isArray(data)) {
      return results
    }
    
    // Process each item
    for (const item of data) {
      const itemPath = `${folderPath}/${item.name}`
      
      if (item.name === '.folder') {
        continue // Skip folder placeholder
      } else if (!item.metadata?.mimetype) {
        // It's a subfolder - get its files recursively
        const subFiles = await getAllFilesInFolder(itemPath)
        results.push(...subFiles)
      } else {
        // It's a file - add to results
        results.push(itemPath)
      }
    }
  } catch (error: any) {
    console.error(`❌ Error in getAllFilesInFolder:`, error)
  }
  
  return results
}

/**
 * Utility function to test Supabase storage connectivity
 * and report bucket information
 */
export async function testConnection(): Promise<{
  success: boolean;
  bucketExists: boolean;
  message: string;
  bucketInfo?: any;
  error?: any;
}> {
  try {
    console.log(`🔍 Testing Supabase storage connection for bucket: ${BUCKET_NAME}`)
    
    // Get list of all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error(`❌ Storage connection error:`, bucketsError)
      return {
        success: false,
        bucketExists: false,
        message: `Failed to connect to Supabase storage: ${bucketsError.message}`,
        error: bucketsError
      }
    }
    
    if (!buckets || !Array.isArray(buckets)) {
      return {
        success: true,
        bucketExists: false,
        message: 'Connected to Supabase storage, but no buckets found.',
      }
    }
    
    // Check if our bucket exists
    const bucket = buckets.find(b => b.name === BUCKET_NAME)
    if (!bucket) {
      console.warn(`⚠️ Bucket "${BUCKET_NAME}" not found in Supabase`)
      return {
        success: true,
        bucketExists: false,
        message: `Connected to Supabase storage, but bucket "${BUCKET_NAME}" doesn't exist.`,
        bucketInfo: { availableBuckets: buckets.map(b => b.name) }
      }
    }
    
    // Try to list root directory to confirm access
    const { data: rootFiles, error: rootError } = await supabase.storage.from(BUCKET_NAME).list('')
    
    if (rootError) {
      console.error(`❌ Cannot access bucket "${BUCKET_NAME}":`, rootError)
      return {
        success: true,
        bucketExists: true,
        message: `Bucket "${BUCKET_NAME}" exists but cannot be accessed: ${rootError.message}`,
        bucketInfo: bucket,
        error: rootError
      }
    }
    
    console.log(`✅ Successfully connected to bucket "${BUCKET_NAME}" with ${rootFiles?.length || 0} items in root`)
    return {
      success: true,
      bucketExists: true,
      message: `Successfully connected to bucket "${BUCKET_NAME}" with ${rootFiles?.length || 0} items in root`,
      bucketInfo: {
        ...bucket,
        rootItemCount: rootFiles?.length || 0
      }
    }
  } catch (error) {
    console.error(`❌ Unexpected error testing storage connection:`, error)
    return {
      success: false,
      bucketExists: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      error
    }
  }
}

