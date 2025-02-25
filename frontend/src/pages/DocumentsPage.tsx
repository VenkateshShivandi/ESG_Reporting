"use client"

import React from "react"

import { useState, useEffect, useCallback } from "react"
import type { NextPage } from "next"
import { Upload, Folder, File, Trash2, Download, ChevronRight, Loader2 } from "lucide-react"
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
import type { FileItem, UploadProgress } from "@/lib/types/documents"
import { useFilesStore } from "@/lib/store/files-store"

type Props = {}

const ALLOWED_FILE_TYPES = ".xlsx,.csv,.docx,.xml,.pdf"
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const DocumentsPage: NextPage<Props> = () => {
  const { files, setFiles, addFile, removeFile, removeFiles } = useFilesStore()
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})
  const [isLoading, setIsLoading] = useState(true)

  const getCurrentFolderItems = useCallback(() => {
    return files.filter((item) => JSON.stringify(item.path) === JSON.stringify(currentPath))
  }, [files, currentPath])

  const loadFiles = useCallback(async () => {
    try {
      setIsLoading(true)
      // const files = await listFiles(currentPath.join("/"))
      // setItems(files)
      setIsLoading(false)
    } catch (error) {
      // Sentry.captureException(error)
      toast.error("Failed to load files")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleSelectItem = (itemId: string) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId)
      } else {
        return [...prev, itemId]
      }
    })
  }

  const handleSelectAll = () => {
    const currentItems = getCurrentFolderItems()
    if (selectedItems.length === currentItems.length) {
      // If all items are selected, unselect all
      setSelectedItems([])
    } else {
      // Otherwise, select all items in the current folder
      setSelectedItems(currentItems.map((item) => item.id))
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

        // Validate file type
        const fileType = file.name.split(".").pop()?.toLowerCase()
        const allowedTypes = ["xlsx", "csv", "docx", "xml", "pdf"]
        if (!fileType || !allowedTypes.includes(fileType)) {
          toast.error(`File type not allowed: ${file.name}`)
          continue
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`File too large: ${file.name}`)
          continue
        }

        setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }))
        await new Promise((resolve) => setTimeout(resolve, 500))
        setUploadProgress((prev) => ({ ...prev, [fileId]: 50 }))
        await new Promise((resolve) => setTimeout(resolve, 500))
        setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))

        const newFile: FileItem = {
          id: fileId,
          name: file.name,
          type: "file",
          size: file.size,
          modified: new Date(),
          path: currentPath,
          file: file,
        }

        addFile(newFile)
        toast.success(`File ${file.name} uploaded successfully`)
      }
    } catch (error) {
      console.error("File upload error:", error)
      toast.error("Failed to upload file(s)")
    } finally {
      setIsUploading(false)
      setUploadProgress({})
      const input = document.getElementById("file-upload") as HTMLInputElement
      if (input) input.value = ""
    }
  }

  const handleCreateFolder = (name: string) => {
    if (!name.trim()) {
      toast.error("Please enter a folder name")
      return
    }

    // Check if folder already exists in current path
    if (
      files.some(
        (item) =>
          item.type === "folder" && item.name === name && JSON.stringify(item.path) === JSON.stringify(currentPath),
      )
    ) {
      toast.error("A folder with this name already exists")
      return
    }

    const newFolder: FileItem = {
      id: Math.random().toString(36).substring(7),
      name: name,
      type: "folder",
      modified: new Date(),
      path: currentPath,
    }

    addFile(newFolder)
    toast.success(`Folder ${name} created successfully`)
  }

  const handleDelete = (itemId?: string) => {
    if (itemId) {
      removeFile(itemId)
      toast.success("Item deleted successfully")
      setSelectedItems((prev) => prev.filter((id) => id !== itemId))
    } else {
      removeFiles(selectedItems)
      toast.success("Selected items deleted successfully")
      setSelectedItems([])
    }
  }

  const handleDownload = async (item: FileItem) => {
    try {
      if (!item.file) {
        throw new Error("File not found")
      }

      const url = URL.createObjectURL(item.file)
      const a = document.createElement("a")
      a.href = url
      a.download = item.name
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
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
                  <Folder className="w-4 h-4 mr-2" />
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
                    getCurrentFolderItems().length > 0 && selectedItems.length === getCurrentFolderItems().length
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
                key={item.id}
                className={`${selectedItems.includes(item.id) ? "bg-muted" : ""} ${
                  item.type === "folder" ? "cursor-pointer hover:bg-muted/50" : ""
                }`}
                onClick={(e) => {
                  // If it's a folder and the click wasn't on the checkbox, navigate into it
                  if (item.type === "folder" && !(e.target as HTMLElement).closest('input[type="checkbox"]')) {
                    setCurrentPath([...currentPath, item.name])
                  } else {
                    handleSelectItem(item.id)
                  }
                }}
              >
                <TableCell className="w-[30px]" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) => {
                      handleSelectItem(item.id)
                    }}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-2">
                    {item.type === "folder" ? (
                      <Folder className="w-5 h-5 text-[#2E7D32]" />
                    ) : (
                      <File className="w-5 h-5 text-[#2E7D32]" />
                    )}
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
                  {item.modified instanceof Date
                    ? item.modified.toLocaleDateString()
                    : new Date(item.modified).toLocaleDateString()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        if (item.type === "file") {
                          handleDownload(item)
                        }
                      }}
                      disabled={item.type === "folder"}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default DocumentsPage

