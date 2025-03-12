"use client"

import React from "react"
import { useState, useEffect, useCallback } from "react"
import type { NextPage } from "next"
import {
  Upload,
  FolderClosed,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  FileType,
  File,
  FileCheck,
  Trash2,
  Download,
  ChevronRight,
  Loader2,
  Info,
  TableProperties,
  GitGraph,
  X,
  Folder
} from "lucide-react"
import { documentsApi } from "@/lib/api/documents"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { toast } from "sonner"
import type { FileItem, UploadProgress, ProcessedFileResult } from "@/lib/types/documents"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

type Props = {}

const ALLOWED_FILE_TYPES = ".xlsx,.csv,.docx,.xml,.pdf"
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Get icon for file or folder
const getFileIcon = (filename: string, type?: string) => {
  // If it's a folder type (case insensitive), return folder icon
  if (type && (type.toLowerCase() === "folder" || type.toLowerCase() === "directory")) {
    return <Folder className="w-5 h-5 text-yellow-600" />
  }

  // Return corresponding icon based on file extension
  const extension = filename.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'docx':
    case 'doc':
      return <FileText className="w-5 h-5 text-blue-600" />
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />
    case 'csv':
      return <FileType className="w-5 h-5 text-green-500" />
    case 'pdf':
      return <FileCheck className="w-5 h-5 text-red-600" />
    default:
      return <File className="w-5 h-5 text-slate-600" />
  }
}

const DocumentsPage: NextPage<Props> = () => {
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})
  const [isLoading, setIsLoading] = useState(true)
  const [processingFile, setProcessingFile] = useState<string | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [fileDetails, setFileDetails] = useState<ProcessedFileResult | null>(null)
  const [showFileDetails, setShowFileDetails] = useState(false)

  const getCurrentFolderItems = useCallback(() => {
    return files.filter((item) => JSON.stringify(item.path) === JSON.stringify(currentPath))
  }, [files, currentPath])

  const loadFiles = useCallback(async () => {
    try {
      setIsLoading(true)
      const fetchedFiles = await documentsApi.listFiles(currentPath)
      setFiles(fetchedFiles)
    } catch (error) {
      console.error("Error loading files:", error)
      toast.error("Failed to load files")
    } finally {
      setIsLoading(false)
    }
  }, [currentPath])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleSelectItem = (itemName: string) => {
    const itemPath = [...currentPath, itemName].join('/')
    setSelectedItems((prev) => {
      if (prev.includes(itemPath)) {
        return prev.filter((path) => path !== itemPath)
      } else {
        return [...prev, itemPath]
      }
    })
  }

  const handleSelectAll = () => {
    const currentItems = getCurrentFolderItems()
    const currentPaths = currentItems.map(item => [...currentPath, item.name].join('/'))

    if (selectedItems.length === currentItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(currentPaths)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) {
      toast.error("No files selected")
      return
    }

    setIsUploading(true)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileId = Math.random().toString(36).substring(7)

        const fileType = file.name.split(".").pop()?.toLowerCase()
        const allowedTypes = ["xlsx", "csv", "docx", "xml", "pdf"]
        if (!fileType || !allowedTypes.includes(fileType)) {
          toast.error(`File type not allowed: ${file.name}`)
          continue
        }

        if (file.size > MAX_FILE_SIZE) {
          toast.error(`File too large: ${file.name}`)
          continue
        }

        setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }))

        try {
          const { fileId: uploadedFileId } = await documentsApi.uploadFile(file, currentPath)
          setUploadProgress((prev) => ({ ...prev, [fileId]: 60 }))
          await documentsApi.processFile(file)
          setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))
          await loadFiles()
          toast.success(`File ${file.name} processed successfully`)
        } catch (error) {
          console.error("File processing error:", error)
          toast.error(`Failed to process file: ${file.name}`)
        }
      }
    } catch (error) {
      console.error("File upload error:", error)
      toast.error("Failed to upload file(s)")
    } finally {
      setIsUploading(false)
      setProcessingFile(null)
      setProcessingError(null)
      setUploadProgress({})
      const input = document.getElementById("file-upload") as HTMLInputElement
      if (input) input.value = ""
    }
  }

  const handleCreateFolder = async (name: string) => {
    if (!name.trim()) {
      toast.error("Please enter a folder name")
      return
    }

    if (files.some(item =>
      item.type === "folder" &&
      item.name === name &&
      JSON.stringify(item.path) === JSON.stringify(currentPath)
    )) {
      toast.error("A folder with this name already exists")
      return
    }

    try {
      await documentsApi.createFolder(name, currentPath)
      loadFiles()
      toast.success(`Folder ${name} created successfully`)
    } catch (error) {
      console.error("Error creating folder:", error)
      toast.error("Failed to create folder")
    }
  }

  const handleDelete = async (itemPath?: string) => {
    try {
      if (itemPath) {
        await documentsApi.deleteFile(itemPath)
        await loadFiles()
        setSelectedItems((prev) => prev.filter((id) => id !== itemPath))
        toast.success("Item deleted successfully")
      } else {
        for (const path of selectedItems) {
          await documentsApi.deleteFile(path)
        }
        await loadFiles()
        setSelectedItems([])
        toast.success("Selected items deleted successfully")
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete item(s)")
    }
  }

  const handleDownload = async (item: FileItem) => {
    try {
      const { url } = await documentsApi.getDownloadUrl(item.id)

      if (item.file) {
        const localUrl = URL.createObjectURL(item.file)
        const a = document.createElement("a")
        a.href = localUrl
        a.download = item.name
        document.body.appendChild(a)
        a.click()
        URL.revokeObjectURL(localUrl)
        document.body.removeChild(a)
      } else {
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Failed to download file")
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "-"
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const viewFileDetails = (file: FileItem) => {
    if (file.processingResult) {
      const fileResult: ProcessedFileResult = {
        type: file.type,
        filename: file.name,
        size: file.size || 0,
        processed_at: file.modified.toLocaleString(),
      }
      setFileDetails(fileResult)
      setShowFileDetails(true)
    }
  }

  const FileDetailsDialog = () => {
    if (!fileDetails || !showFileDetails) return null;

    return (
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-30"
            onClick={() => setShowFileDetails(false)}></div>
          <div className="relative bg-white rounded-lg shadow-xl max-w-3xl max-h-[90vh] overflow-hidden w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{fileDetails.filename} Details</h2>
              <button
                onClick={() => setShowFileDetails(false)}
                className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <Tabs defaultValue="summary" className="flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">
                  <Info className="w-4 h-4 mr-2" /> Summary
                </TabsTrigger>
                <TabsTrigger value="content">
                  <FileText className="w-4 h-4 mr-2" /> Content
                </TabsTrigger>
                <TabsTrigger value="data" disabled={!fileDetails.sample_data}>
                  <TableProperties className="w-4 h-4 mr-2" /> Data
                </TabsTrigger>
                <TabsTrigger value="structure" disabled={!fileDetails.root}>
                  <GitGraph className="w-4 h-4 mr-2" /> Structure
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="overflow-auto">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-4">
                      <h3 className="font-medium mb-2">File Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="font-medium">{fileDetails.type.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Size:</span>
                          <span className="font-medium">{formatFileSize(fileDetails.size)}</span>
                        </div>
                        {fileDetails.pages && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pages:</span>
                            <span className="font-medium">{fileDetails.pages}</span>
                          </div>
                        )}
                        {fileDetails.rows && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rows:</span>
                            <span className="font-medium">{fileDetails.rows}</span>
                          </div>
                        )}
                        {fileDetails.columns && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Columns:</span>
                            <span className="font-medium">{fileDetails.columns}</span>
                          </div>
                        )}
                        {fileDetails.paragraph_count && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Paragraphs:</span>
                            <span className="font-medium">{fileDetails.paragraph_count}</span>
                          </div>
                        )}
                        {fileDetails.table_count && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tables:</span>
                            <span className="font-medium">{fileDetails.table_count}</span>
                          </div>
                        )}
                        {fileDetails.element_count && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">XML Elements:</span>
                            <span className="font-medium">{fileDetails.element_count}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {fileDetails.metadata && (
                      <div className="bg-muted rounded-lg p-4">
                        <h3 className="font-medium mb-2">Metadata</h3>
                        <div className="space-y-2 text-sm">
                          {fileDetails.metadata.title && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Title:</span>
                              <span className="font-medium">{fileDetails.metadata.title}</span>
                            </div>
                          )}
                          {fileDetails.metadata.author && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Author:</span>
                              <span className="font-medium">{fileDetails.metadata.author}</span>
                            </div>
                          )}
                          {fileDetails.metadata.creation_date && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Created:</span>
                              <span className="font-medium">{fileDetails.metadata.creation_date}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="h-full overflow-hidden">
                <ScrollArea className="h-[400px] rounded-md border p-4">
                  {fileDetails.preview ? (
                    <div className="whitespace-pre-wrap font-mono text-sm">
                      {fileDetails.preview}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No preview available for this file type
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="data" className="h-full overflow-hidden">
                {fileDetails.sample_data && fileDetails.column_names ? (
                  <ScrollArea className="h-[400px] rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {fileDetails.column_names.map((column, index) => (
                            <TableHead key={index}>{column}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fileDetails.sample_data.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {fileDetails.column_names!.map((column, colIndex) => (
                              <TableCell key={colIndex}>{row[column]}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No tabular data available for this file type
                  </div>
                )}
              </TabsContent>

              <TabsContent value="structure" className="h-full overflow-hidden">
                {fileDetails.root ? (
                  <ScrollArea className="h-[400px] rounded-md border p-4">
                    <div className="space-y-4">
                      <div className="bg-muted p-3 rounded-md">
                        <h3 className="font-medium">Root Element: {fileDetails.root.name}</h3>
                        {Object.keys(fileDetails.root.attributes).length > 0 && (
                          <div className="mt-2">
                            <h4 className="text-sm font-medium">Attributes:</h4>
                            <pre className="bg-background p-2 rounded text-xs mt-1">
                              {JSON.stringify(fileDetails.root.attributes, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>

                      {fileDetails.children_preview && fileDetails.children_preview.length > 0 && (
                        <div>
                          <h3 className="font-medium mb-2">Child Elements:</h3>
                          <div className="space-y-2">
                            {fileDetails.children_preview.map((child, index) => (
                              <div key={index} className="border rounded-md p-3">
                                <h4 className="font-medium text-sm">{child.tag}</h4>
                                {Object.keys(child.attributes).length > 0 && (
                                  <div className="mt-1">
                                    <h5 className="text-xs font-medium">Attributes:</h5>
                                    <pre className="bg-muted p-2 rounded text-xs mt-1">
                                      {JSON.stringify(child.attributes, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {child.text && (
                                  <div className="mt-1">
                                    <h5 className="text-xs font-medium">Text:</h5>
                                    <div className="bg-muted p-2 rounded text-xs mt-1 break-words">
                                      {child.text}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No structure information available for this file type
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowFileDetails(false)}>Close</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border shadow-sm">
      <div className="border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-semibold">ESG Documents</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Input
              type="file"
              multiple
              className="hidden"
              id="file-upload"
              onChange={handleFileUpload}
              accept={ALLOWED_FILE_TYPES}
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer" asChild>
                <span>
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Files
                </span>
              </Button>
            </label>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                  <DialogDescription>Enter a name for your new folder</DialogDescription>
                </DialogHeader>
                <Input
                  id="folder-name"
                  placeholder="Folder name"
                  className="mt-4"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.currentTarget
                      handleCreateFolder(input.value)
                      input.value = ""
                      e.currentTarget.closest("dialog")?.close()
                    }
                  }}
                />
                <DialogFooter className="mt-4">
                  <Button
                    onClick={(e) => {
                      const input = document.getElementById("folder-name") as HTMLInputElement
                      handleCreateFolder(input.value)
                      input.value = ""
                      e.currentTarget.closest("dialog")?.close()
                    }}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" disabled={selectedItems.length === 0} onClick={() => handleDelete()}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
        <Breadcrumb className="px-4 py-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => setCurrentPath([])}>Home</BreadcrumbLink>
            </BreadcrumbItem>
            {currentPath.map((folder, index) => (
              <React.Fragment key={index}>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}>
                    {folder}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={
                    getCurrentFolderItems().length > 0 &&
                    selectedItems.length === getCurrentFolderItems().length
                  }
                  onChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[400px]">Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Modified</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getCurrentFolderItems().map((item) => (
              <TableRow
                key={item.name}
                className={`${selectedItems.includes([...currentPath, item.name].join('/')) ? "bg-muted" : ""
                  } ${item.type === "folder" ? "cursor-pointer hover:bg-muted/50" : ""
                  }`}
                onClick={(e) => {
                  if (item.type === "folder" && !(e.target as HTMLElement).closest('input[type="checkbox"]')) {
                    setCurrentPath([...currentPath, item.name])
                  } else {
                    handleSelectItem(item.name)
                  }
                }}
              >
                <TableCell className="w-[30px]" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={selectedItems.includes([...currentPath, item.name].join('/'))}
                    onChange={() => handleSelectItem(item.name)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-2">
                    {getFileIcon(item.name, item.type)}
                    <span>{item.name}</span>
                    {uploadProgress[item.id] !== undefined && (
                      <div className="w-24 h-1 ml-2 bg-gray-200 rounded-full">
                        <div
                          className="h-full bg-[#2E7D32] rounded-full"
                          style={{ width: `${uploadProgress[item.id]}%` }}
                        />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatFileSize(item.size)}</TableCell>
                <TableCell>
                  {typeof item.modified === 'string'
                    ? new Date(item.modified).toLocaleDateString()
                    : item.modified instanceof Date
                      ? item.modified.toLocaleDateString()
                      : new Date().toLocaleDateString()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center space-x-2">
                    {item.type === "file" && item.processed && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewFileDetails(item)}
                        title="View Details"
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        const fullPath = currentPath.length > 0
                          ? `${currentPath.join('/')}/${item.name}`
                          : item.name
                        handleDelete(fullPath)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {fileDetails && <FileDetailsDialog />}
    </div>
  )
}

export default DocumentsPage