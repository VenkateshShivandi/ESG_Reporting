export interface FileItem {
    id: string
    name: string
    type: "file" | "folder"
    size?: number
    modified: Date
    path: string[]
    file?: File // Store the actual File object for local storage
  }
  
  export interface UploadProgress {
    [key: string]: number
  }
  
  export interface FileUploadResponse {
    path: string
    url: string
  }
  
  