export type FileItem = {
  id: string
  name: string
  type: "file" | "folder"
  size?: number
  modified: Date
  path: string[]
  file?: File
  processing?: boolean
  processed?: boolean
  processingResult?: ProcessedFileResult
  processingError?: string
}

export type UploadProgress = {
  [key: string]: number
}

export type ProcessedFileResult = {
  type: string
  filename: string
  size: number
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
  }
  preview?: string
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
  
  