export type FileItem = {
  id: string
  name: string
  type: 'file' | 'folder'
  size?: number
  modified: Date
  path: string[]
  file?: File
  processing?: boolean
  processed?: boolean
  processingResult?: ProcessedFileResult
  processingError?: string
  chunked?: boolean
  created_at?: string
  updated_at?: string
  has_graph?: boolean
  chunk_count?: number
  metadata?: {
    mimetype?: string
    lastModified?: string
    contentLength?: number
  }
}

export type UploadProgress = {
  [key: string]: number
}

export type ProcessedFileResult = {
  type: string
  filename: string
  size?: number
  processed_at: string
  pages?: number
  rows?: number
  columns?: number
  column_names?: string[]
  sample_data?: Record<string, string>[]
  metadata?: {
    title?: string
    author?: string
    creation_date?: string
    mimetype?: string
    item_count?: number
  }
  preview?: string
  fileUrl?: string
  paragraph_count?: number
  table_count?: number
  element_count?: number
  root?: {
    name: string
    attributes: Record<string, string>
  }
  children_preview?: Array<{
    tag: string
    attributes: Record<string, string>
    text?: string
  }>
}

export interface FileUploadResponse {
  path: string
  url: string
}

export interface RenameItemResponse {
  success: boolean
  oldPath: string
  newPath: string
  warning?: string
}
