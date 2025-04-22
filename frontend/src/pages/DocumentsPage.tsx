"use client"

import React from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
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
  Folder,
  MoreVertical,
  Edit,
  FolderInput,
  RefreshCw,
  GripVertical,
  BarChart3,
  FolderX,
  Eye,
  FileX
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChunkResult, Chunk } from "@/lib/api/documents"
import DraggableFileItem from "@/components/documents/DraggableFileItem"
import DroppableFolderItem from "@/components/documents/DroppableFolderItem"
import { DragItem } from "@/lib/hooks/useDragDrop"
import { useFilesStore } from "@/lib/store/files-store"
import { motion, AnimatePresence } from "framer-motion"
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

const MotionTable = motion(Table)

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

// Helper for file type badge
const getFileTypeBadge = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  let color = 'bg-slate-200 text-slate-700';
  if (ext === 'pdf') color = 'bg-red-100 text-red-700';
  if (ext === 'docx' || ext === 'doc') color = 'bg-blue-100 text-blue-700';
  if (ext === 'xlsx' || ext === 'xls') color = 'bg-green-100 text-green-700';
  if (ext === 'csv') color = 'bg-green-50 text-green-700';
  return (
    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${color}`}>{ext.toUpperCase()}</span>
  );
};

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
  const [renamingItem, setRenamingItem] = useState<FileItem | null>(null)
  const [newItemName, setNewItemName] = useState("")
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [filesToMove, setFilesToMove] = useState<{ fileId: string; filePath: string[] }[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false)
  const [itemToMove, setItemToMove] = useState<FileItem | null>(null)
  const [allFoldersForMove, setAllFoldersForMove] = useState<FileItem[]>([])
  const [selectedMoveTargetPath, setSelectedMoveTargetPath] = useState<string[] | null>(null)
  const [localSelectedPath, setLocalSelectedPath] = useState<string[] | null>(null)

  // State for Preview Dialog
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [urlToPreview, setUrlToPreview] = useState<string | null>(null); // State to hold URL generated in onClick

  // Add a state to track iframe loading
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  // Add a new state to track loading attempts
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Add state for iframe-specific loading errors
  const [iframeError, setIframeError] = useState<string | null>(null);

  // create a unique identifier for comparing the item being renamed
  const getItemUniqueId = useCallback((item: FileItem) => {
    // use the path+name as the unique identifier, to avoid the problem of id being null
    return [...(item.path || []), item.name].join('/');
  }, []);

  const [showChunks, setShowChunks] = useState(false);
  const [selectedFileChunks, setSelectedFileChunks] = useState<Chunk[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const getCurrentFolderItems = useCallback(() => {
    return files
      .filter((item) => JSON.stringify(item.path) === JSON.stringify(currentPath))
      .filter((item) => item.name !== '.folder') // Hide the .folder placeholder files
      .filter((item) => // Filter by search query (case-insensitive)
        searchQuery === "" || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [files, currentPath, searchQuery])

  // Update document count when files change
  useEffect(() => {
    // Count only real document files (not folders or placeholder files)
    const documentCount = files.filter(item =>
      item.type === "file" &&
      item.name !== '.folder' &&
      !item.name.startsWith('.')
    ).length;

    // Dispatch an event with the document count
    const event = new CustomEvent('documentCountUpdate', {
      detail: { count: documentCount }
    });

    window.dispatchEvent(event);
  }, [files]);

  const loadFiles = useCallback(async () => {
    try {
      setIsLoading(true)
      const fetchedFiles = await documentsApi.listFiles(currentPath)
      setFiles(fetchedFiles)
    } catch (error) {
      console.error("Error loading files:", error)
      toast.error("Failed to load files")
      
      // Reset files to empty array to prevent showing stale data
      setFiles([])
    } finally {
      // Always reset loading state
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
    
    // Show overall upload started toast
    const uploadToastId = toast.loading(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`)

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
      
      // Update the upload completed toast
      toast.success(`Upload completed successfully`, { id: uploadToastId })
    } catch (error) {
      console.error("File upload error:", error)
      toast.error("Failed to upload file(s)", { id: uploadToastId })
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

    // Add toast to show operation is in progress
    const toastId = toast.loading(`Creating folder "${name}"...`)
    
    try {
      // Don't set isLoading yet - keep the current files visible while the API call is in progress
      await documentsApi.createFolder(name, currentPath)
      
      // Only now set loading to true, after the API call completes
      setIsLoading(true)
      
      // Use a small timeout before reloading to ensure UI transition is smooth
      setTimeout(async () => {
        await loadFiles() // This will fetch the updated file list and set isLoading to false
        toast.success(`Folder ${name} created successfully`, { id: toastId })
      }, 300)
    } catch (error) {
      console.error("Error creating folder:", error)
      toast.error("Failed to create folder", { id: toastId })
    }
  }

  const handleDelete = async (itemPath?: string) => {
    try {
      if (itemPath) {
        // Find the item name from the path
        const itemName = itemPath.split('/').pop() || 'Item';
        
        // Show delete in progress toast
        const deleteToastId = toast.loading(`Deleting ${itemName}...`);
        
        await documentsApi.deleteFile(itemPath)
        
        // Set loading after API call completes
        setIsLoading(true)
        
        // Use a short timeout for a smoother transition
        setTimeout(async () => {
          await loadFiles()
          setSelectedItems((prev) => prev.filter((id) => id !== itemPath))
          toast.success(`${itemName} deleted successfully`, { id: deleteToastId })
        }, 300)
      } else {
        // Show multiple delete in progress toast
        const deleteToastId = toast.loading(`Deleting ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}...`);
        
        for (const path of selectedItems) {
          await documentsApi.deleteFile(path)
        }
        
        // Set loading after API calls complete
        setIsLoading(true)
        
        // Use a short timeout for a smoother transition
        setTimeout(async () => {
          await loadFiles()
          setSelectedItems([])
          toast.success(`${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''} deleted successfully`, { id: deleteToastId })
        }, 300)
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete item(s)")
    }
  }

  const handleDownload = async (item: FileItem) => {
    try {
      // Use path if id is not available
      const identifier = item.id || [...(item.path || []), item.name].join('/');
      const { url } = await documentsApi.getDownloadUrl(identifier);

      // Open the URL in a new tab for direct download
      window.open(url, '_blank');
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  }

  const handleStartRename = (item: FileItem) => {
    setRenamingItem(item)
    setNewItemName(item.name)

    // register a single click interceptor to prevent click events from bubbling to external processors
    const clickInterceptor = (e: MouseEvent) => {
      e.stopPropagation();
      document.removeEventListener('click', clickInterceptor, true);
    };
    // register in the capture phase to ensure we intercept first
    document.addEventListener('click', clickInterceptor, true);

    // Focus the input after it renders with a longer delay to ensure menu is closed
    setTimeout(() => {
      if (renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
      }
    }, 100); // Increased delay to 100ms
  }

  const handleCancelRename = () => {
    setRenamingItem(null)
    setNewItemName("")
  }

  const handleSubmitRename = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (renamingItem && newItemName && newItemName !== renamingItem.name) {
      // Show rename in progress toast
      const renameToastId = toast.loading(`Renaming "${renamingItem.name}" to "${newItemName}"...`);
      
      try {
        const fullPath = renamingItem.path.length > 0
          ? `${renamingItem.path.join('/')}/${renamingItem.name}`
          : renamingItem.name

        const response = await documentsApi.renameItem(fullPath, newItemName)

        // Set loading after API call completes
        setIsLoading(true)
        
        // Use a short timeout for a smoother transition
        setTimeout(async () => {
          // Reload the file list regardless, ensuring UI reflects the latest state
          await loadFiles()
          
          // handle warning information
          if (response.warning) {
            toast.warning(`Partial success: ${response.warning}`, {
              description: "New folder created, but the original folder may still exist",
              duration: 5000,
              id: renameToastId
            })
          } else {
            toast.success(`Renamed to ${newItemName}`, { id: renameToastId })
          }
        }, 300)
      } catch (error: any) {
        console.error("Rename error:", error)

        // Check if there's detailed error information
        const errorMessage = error.response?.data?.error || "Rename failed"

        if (errorMessage.includes("already exists")) {
          toast.error(`Rename failed: A file or folder with the same name already exists`, { id: renameToastId })
        } else if (renamingItem.type === "folder") {
          toast.error(`Folder rename failed`, {
            description: "Please refresh the page to see the actual status, operation may be partially successful",
            id: renameToastId
          })
        } else {
          toast.error(`Rename failed: ${errorMessage}`, { id: renameToastId })
        }

        // Reload the file list to ensure UI is in sync with the server
        await loadFiles()
      }
    }

    setRenamingItem(null)
    setNewItemName("")
  }, [renamingItem, newItemName, loadFiles]);

  // Setup document click handler for rename operation
  useEffect(() => {
    if (!renamingItem) return; // If there's no item being renamed, don't add event listener

    // Delay adding the outside-click handler a bit to avoid menu click conflicts
    const timerId = setTimeout(() => {
      // Handle clicks outside the rename input
      const handleClickOutside = (e: MouseEvent) => {
        // Only process when click is not on the input itself
        if (renameInputRef.current && !renameInputRef.current.contains(e.target as Node)) {
          handleSubmitRename();
        }
      };

      // Use capture phase event listening to ensure we process before other handlers
      document.addEventListener('mousedown', handleClickOutside);

      // Clean up
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, 300); // Wait 300ms before adding the event listener

    return () => {
      clearTimeout(timerId);
    };
  }, [renamingItem, handleSubmitRename]);

  const handleMoveItem = async (item: FileItem) => {
    // Fetch all folders specifically for the move dialog
    try {
      const allItems = await documentsApi.listFiles([]) // Assuming this fetches all items/folders
      const foldersOnly = allItems.filter(f => f.type === 'folder');
      setAllFoldersForMove(foldersOnly);
      setItemToMove(item);
      setLocalSelectedPath(null); // Reset selection
      setIsMoveModalOpen(true);
    } catch (error) {
      console.error("Error fetching folder structure for move:", error);
      toast.error("Could not load folder structure to move item.");
    }
  }

  const handleReUpload = async (item: FileItem) => {
    // This would trigger a file input to replace the file
    toast.info("Re-upload functionality to be implemented")
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
          <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setShowFileDetails(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl max-h-[90vh] overflow-hidden w-full p-8" style={{ boxShadow: '0 8px 32px 0 rgba(16,30,54,0.16)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{fileDetails.filename} <span className="text-base font-normal text-slate-400">Details</span></h2>
              <button
                onClick={() => setShowFileDetails(false)}
                className="rounded-full p-2 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition shadow"
                title="Close"
              >
                <X className="h-6 w-6 text-slate-500" />
              </button>
            </div>
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6" />
            <Tabs defaultValue="summary" className="flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-4 mb-4">
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
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 shadow-sm">
                      <h3 className="font-semibold mb-3 text-slate-800 dark:text-slate-100">File Information</h3>
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
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 shadow-sm">
                        <h3 className="font-semibold mb-3 text-slate-800 dark:text-slate-100">Metadata</h3>
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
                  <div className="overflow-y-auto h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {fileDetails.column_names.map((column, index) => (
                            <TableHead key={index}>{column}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="min-h-[400px]">
                        {fileDetails.sample_data.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {fileDetails.column_names!.map((column, colIndex) => (
                              <TableCell key={colIndex}>{row[column]}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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

            <div className="mt-8 flex justify-end">
              <Button onClick={() => setShowFileDetails(false)} className="rounded-full px-6 py-2 text-base font-semibold shadow-sm bg-emerald-600 hover:bg-emerald-700">Close</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Function to handle file drop onto a folder
  const handleFileDrop = async (droppedFile: DragItem, targetPath: string[]) => {
    try {
      // Find the actual file object from our state
      const fileItem = files.find(
        (f) => f.id === droppedFile.id && 
        JSON.stringify(f.path) === JSON.stringify(droppedFile.path)
      )
      
      if (!fileItem) {
        toast.error("File not found")
        return
      }
      
      // Check if it's a folder being dropped to itself or its subdirectory
      if (fileItem.type === "folder") {
        const targetPathStr = targetPath.join('/')
        const filePathStr = [...fileItem.path, fileItem.name].join('/')
        
        if (targetPathStr.startsWith(filePathStr)) {
          toast.error("Cannot move a folder into itself or its subdirectory")
          return
        }
      }
      
      // Get target folder name for better toast message
      const targetFolderName = targetPath[targetPath.length - 1] || 'Home'
      
      // Add toast to show operation is in progress
      const toastId = toast.loading(`Moving ${fileItem.name} to ${targetFolderName}...`)
      
      // Construct old and new paths for the rename operation
      const oldPathArray = [...fileItem.path, fileItem.name]
      const oldPath = oldPathArray.join('/')
      const newPath = [...targetPath, fileItem.name].join('/')
      
      console.log(`Moving ${oldPath} to ${newPath}`)
      
      // Call the renameItem API function to move the file
      const response = await documentsApi.renameItem(oldPath, newPath)
      
      if (response.success) {
        // Update the file's path in our state
        const updatedFileItem = {
          ...fileItem,
          path: targetPath
        }
        
        // Update the file in the store
        useFilesStore.getState().updateFile(fileItem.id, updatedFileItem)
        
        // Reload the files to reflect changes
        await loadFiles()
        
        toast.success(`Moved ${fileItem.name} to ${targetFolderName}`, { id: toastId })
      } else {
        toast.error(`Failed to move ${fileItem.name}`, { id: toastId })
      }
    } catch (error) {
      console.error("Error in handleFileDrop:", error)
      toast.error("Failed to move file")
    }
  }
  
  // Function to handle file drop onto another file (to create a folder)
  const handleFileToFileDrop = async (droppedFile: DragItem, targetFile: FileItem) => {
    try {
      // Don't allow dropping a file onto itself
      if (droppedFile.id === targetFile.id) {
        return
      }
      
      // Find the actual source file from our state
      const sourceFile = files.find(
        (f) => f.id === droppedFile.id && 
        JSON.stringify(f.path) === JSON.stringify(droppedFile.path)
      )
      
      if (!sourceFile) {
        toast.error("Source file not found")
        return
      }
      
      // Check if both files are in the same directory
      if (JSON.stringify(sourceFile.path) !== JSON.stringify(targetFile.path)) {
        toast.error("Files must be in the same folder to create a new folder")
        return
      }
      
      // Set up for folder creation
      setIsCreatingFolder(true)
      setNewFolderName("New Folder")
      setFilesToMove([
        { fileId: sourceFile.id, filePath: [...sourceFile.path, sourceFile.name] },
        { fileId: targetFile.id, filePath: [...targetFile.path, targetFile.name] }
      ])
    } catch (error) {
      console.error("Error in handleFileToFileDrop:", error)
      toast.error("Failed to prepare folder creation")
    }
  }
  
  // Function to create a folder and move files into it
  const handleCreateFolderAndMoveFiles = async () => {
    if (!newFolderName.trim()) {
      toast.error("Please enter a folder name")
      return
    }
    
    if (filesToMove.length === 0) {
      setIsCreatingFolder(false)
      return
    }
    
    // Add toast to show operation is in progress
    const toastId = toast.loading(`Creating folder "${newFolderName}" and moving files...`)
    
    try {
      // Get the path of the parent directory
      const parentPath = filesToMove[0].filePath.slice(0, -1) // Remove filename
      
      // Create the new folder
      await documentsApi.createFolder(newFolderName, parentPath)
      
      // Move each file to the new folder
      for (const file of filesToMove) {
        const oldPath = file.filePath.join('/')
        const newPath = [...parentPath, newFolderName, file.filePath[file.filePath.length - 1]].join('/')
        
        await documentsApi.renameItem(oldPath, newPath)
      }
      
      // Reset state
      setIsCreatingFolder(false)
      setFilesToMove([])
      
      // Reload the files
      await loadFiles()
      
      toast.success(`Created folder "${newFolderName}" and moved files successfully`, { id: toastId })
    } catch (error) {
      console.error("Error creating folder and moving files:", error)
      toast.error("Failed to create folder and move files", { id: toastId })
    }
  }

  const navigateToFolder = (folderName: string) => {
    setCurrentPath([...currentPath, folderName]);
  }

  // Component for the Move Folder Dialog (Basic structure first)
  const MoveFolderDialog = ({
    isOpen,
    onOpenChange,
    item,
    onConfirmMove,
    allFolders,
  }: {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    item: FileItem | null
    onConfirmMove: (targetPath: string[]) => void
    allFolders: FileItem[]
  }) => {
    if (!item) return null

    // Add state for local selection within the dialog
    const [localSelectedPath, setLocalSelectedPath] = useState<string[] | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter folders based on search query
    const filteredFolders = useMemo(() => {
      if (!searchQuery) {
        return allFolders;
      }

      const lowerCaseQuery = searchQuery.toLowerCase();
      const matchedFolders = new Map<string, FileItem>(); // Use Map to avoid duplicates by path string

      // Find folders that match the query directly
      allFolders.forEach(folder => {
        if (folder.name.toLowerCase().includes(lowerCaseQuery)) {
          matchedFolders.set([...folder.path, folder.name].join('/'), folder);
          // Add all ancestors of the matched folder
          let currentPath = folder.path;
          while (currentPath.length > 0) {
            const parentPathStr = currentPath.join('/');
            const parentFolder = allFolders.find(f => [...f.path, f.name].join('/') === parentPathStr);
            if (parentFolder && !matchedFolders.has(parentPathStr)) {
              matchedFolders.set(parentPathStr, parentFolder);
            } else if (!parentFolder) {
              // If a parent isn't found in allFolders (shouldn't happen ideally), stop ascending
              break;
            }
            currentPath = parentFolder.path;
          }
        }
      });

      return Array.from(matchedFolders.values());
    }, [allFolders, searchQuery]);

    // The allFolders prop now contains the complete list

    // TODO: Implement FolderTreeNode component recursively
    // Define FolderTreeNode component
    const FolderTreeNode = ({
      folder,        // The current folder being rendered
      allFolders,    // The COMPLETE list of all folders
      filteredPaths, // A Set of paths that should be visible after filtering
      level = 0,
      onSelect,
      selectedPath,
      index,
    }: {
      folder: FileItem
      allFolders: FileItem[]
      filteredPaths: Set<string> // Use a Set for efficient lookup
      level?: number
      onSelect: (path: string[]) => void
      selectedPath: string[] | null
      index: number
    }) => {
      const fullPath = [...folder.path, folder.name];
      const fullPathString = fullPath.join('/');

      // Determine visibility: If search is active, check if this node is in the filtered set
      const isVisible = !searchQuery || filteredPaths.has(fullPathString);

      if (!isVisible) return null; // Don't render if this node itself is filtered out

      // Find child folders by matching their path with the current folder's fullPath
      const childFolders = allFolders.filter(
        (f) => JSON.stringify(f.path) === JSON.stringify(fullPath)
      );

      const isSelected = JSON.stringify(fullPath) === JSON.stringify(selectedPath);

      // Check if the index is even for alternating background
      const isEven = index % 2 === 0;

      return (
        <div key={folder.id || folder.name}> 
          <div 
            style={{ paddingLeft: `${level * 1.75}rem` }}
            // Add alternating background based on index
            className={`flex items-center p-1.5 rounded-sm cursor-pointer transition-colors duration-100 
              ${isEven ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-800'} 
              ${isSelected 
                ? 'bg-emerald-100 dark:bg-emerald-900' 
                : 'hover:bg-emerald-50 dark:hover:bg-emerald-900'}`}
            onClick={() => onSelect(fullPath)}
          >
            <Folder className="w-4 h-4 mr-1.5 text-yellow-600 flex-shrink-0" />
            <span className={`truncate ${isSelected ? 'font-semibold' : 'font-medium'}`}>{folder.name}</span>
          </div>
          {/* Render children recursively */}
          {childFolders.length > 0 && (
            <div className="mt-1">
              {childFolders.map((child, childIndex) => (
                <FolderTreeNode
                  key={child.id || child.name}
                  folder={child}
                  allFolders={allFolders}
                  filteredPaths={filteredPaths}
                  level={level + 1}
                  index={childIndex} // Pass index down
                  onSelect={onSelect}
                  selectedPath={selectedPath}
                />
              ))}
            </div>
          )}
        </div>
      );
    };

    const handleConfirm = () => {
      if (localSelectedPath !== null) {
        // Basic validation: Don't move to the same folder
        if (JSON.stringify(item.path) === JSON.stringify(localSelectedPath)) {
          toast.error("Cannot move item to its current folder.");
          return;
        }
        onConfirmMove(localSelectedPath);
        onOpenChange(false); // Close modal on confirm
      } else {
        toast.error("Please select a destination folder.")
      }
    }

    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Move Item</DialogTitle>
            <DialogDescription>
              Select a destination folder for <span className="font-semibold">{item.name}</span>.
            </DialogDescription>
          </DialogHeader>
           {/* Add Search Input */}
           <div className="p-4 pb-2"> {/* Improved padding */}
             <Input
               type="text"
               placeholder="Search folders..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full rounded-md bg-slate-100 dark:bg-slate-700 shadow-inner border-slate-200 dark:border-slate-600 focus:ring-1 focus:ring-emerald-300 px-3 py-2 text-sm" // Tweaked style
             />
           </div>
           <div className="px-4 pb-4"> {/* Adjusted padding */}
             {/* Add descriptive text label */}
             <p className="text-sm text-muted-foreground mb-2">Select a folder from the list:</p>
             <ScrollArea className="h-52 border rounded-md p-3 bg-white dark:bg-slate-800"> {/* Reduced height to h-52 */}
               {/* Add Home/Root option */}
               <div
                 className={[
                   "flex items-center p-1.5 my-0.5 rounded cursor-pointer transition-colors duration-100",
                   "text-emerald-700 dark:text-emerald-500",
                   (localSelectedPath !== null && localSelectedPath.length === 0
                     ? "bg-emerald-100 dark:bg-emerald-900"
                     : "hover:bg-emerald-50 dark:hover:bg-emerald-900/50")
                 ].join(" ")}
                 onClick={() => setLocalSelectedPath([])} // Set path to empty array for root
               >
                 <FolderClosed className="w-4 h-4 mr-1.5 text-slate-500 flex-shrink-0" /> {/* Adjusted margin */}
                 <span className="font-semibold">Home</span>
               </div>
               <div className="border-b my-2 border-slate-200 dark:border-slate-700" /> {/* Separator */}
               {/* Render root folders (path === []) initially */}
               {allFolders
                  .filter((f) => f.path.length === 0)
                  // Pass index for root level items
                  .map((folder, index) => { console.log("root render", folder.name); return (
                    <FolderTreeNode
                      key={folder.id || folder.name}
                      folder={folder}
                      allFolders={allFolders}
                      filteredPaths={new Set(filteredFolders.map(f => [...f.path, f.name].join('/')))}
                      level={0}
                      index={index} // Pass index for root items
                      onSelect={setLocalSelectedPath}
                      selectedPath={localSelectedPath}
                    />
                  )})}
             </ScrollArea>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => onOpenChange(false)}>
               Cancel
             </Button>
             <Button onClick={handleConfirm} disabled={localSelectedPath === null || (localSelectedPath !== null && JSON.stringify(item.path) === JSON.stringify(localSelectedPath))}>
               Move Here
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     )
   }

  const handleConfirmMove = useCallback(async (targetPath: string[]) => {
    if (!itemToMove) return;

    const toastId = toast.loading(`Moving ${itemToMove.name}...`);
    try {
      const oldPath = [...itemToMove.path, itemToMove.name].join('/');
      const newPath = [...targetPath, itemToMove.name].join('/');

      console.log(`Moving ${oldPath} to ${newPath}`);
      await documentsApi.renameItem(oldPath, newPath);

      toast.success(`Moved ${itemToMove.name} successfully`, { id: toastId });
      await loadFiles(); // Reload files after move
    } catch (error) {
      console.error("Error moving item:", error);
      toast.error(`Failed to move ${itemToMove.name}`, { id: toastId });
    } finally {
      setItemToMove(null); // Reset item after operation
      setIsMoveModalOpen(false); // Ensure modal closes even on error
    }
  }, [itemToMove, loadFiles, setItemToMove, setIsMoveModalOpen]);

  // Update the preview URL fetching function
  useEffect(() => {
    if (isPreviewOpen && previewFile && urlToPreview) { // Check for urlToPreview
      // --- Start: Simplified Effect --- 
      setIsLoadingPreview(true);
      setIsIframeLoading(true); 
      setIframeError(null); 

      // Directly use the URL prepared in onClick
      setPreviewUrl(urlToPreview); 
      
      // Reset temporary state
      // setUrlToPreview(null); // Optional: Reset if needed, or let it be overwritten next time

      setIsLoadingPreview(false); // Preview URL is set, actual loading happens in iframe

      // Set iframe loading to false after a longer delay
      setTimeout(() => {
        setIsIframeLoading(false);
      }, 5000); 
      // --- End: Simplified Effect ---
    } else if (!isPreviewOpen) {
      // Reset when dialog closes 
      setPreviewUrl(null);
      setLoadAttempt(0);
      setIsRetrying(false);
      setIframeError(null); 
      setUrlToPreview(null); // Clear the stored URL when dialog closes
    }
    // Dependency array includes the URL prepared in onClick
  }, [isPreviewOpen, previewFile, loadAttempt, urlToPreview]);

  // Add a function to handle retry
  const handleRetry = useCallback(() => {
    // loadAttempt triggers useEffect to refetch URL and forces iframe remount via key
    setIsRetrying(true);
    setLoadAttempt(prev => prev + 1);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 py-2 px-0">
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-0 md:p-2 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 mb-0 px-3 pt-3 pb-2">
            <BarChart3 className="h-10 w-10 text-emerald-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight">ESG Documents</h1>
              <p className="text-slate-500 dark:text-slate-400 text-base mt-0">Securely manage, organize, and analyze your ESG files and folders with enterprise-grade tools.</p>
            </div>
          </div>
          <div className="border-b border-slate-200 dark:border-slate-800 mb-1 mx-2" />
    <div className="container mx-auto p-4 lg:p-8">
            <div className="w-full p-0 flex-1 flex flex-col h-full">
              <div className="flex flex-col h-full bg-background rounded-xl shadow-lg flex-1">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-xl mb-2 shadow">
                    {/* Search Bar */}
                    <div className="flex-1 flex items-center mb-3 sm:mb-0">
                      <div className="w-full max-w-xs">
                        <Input
                          type="text"
                          placeholder="Search documents..."
                          className="w-full rounded-full bg-white dark:bg-slate-900 shadow-sm px-4 py-2 border-none focus:ring-2 focus:ring-emerald-200"
                          style={{ boxShadow: '0 1px 4px 0 rgba(16,30,54,0.06)' }}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
            </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
              <Input
                type="file"
                multiple
                className="hidden"
                id="file-upload"
                onChange={handleFileUpload}
                accept={ALLOWED_FILE_TYPES}
              />
                      <label htmlFor="file-upload" title="Upload Files">
                        <Button variant="outline" className="cursor-pointer shadow-sm transition-transform hover:scale-105" asChild>
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
                          <Button variant="outline" className="shadow-sm transition-transform hover:scale-105" title="Create New Folder">
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
                      <Button
                        variant={selectedItems.length === 0 ? "outline" : "destructive"}
                        className={`${selectedItems.length === 0 ? "shadow-sm" : "shadow-sm bg-red-600 text-white hover:bg-red-700"} transition-transform hover:scale-105`}
                        disabled={selectedItems.length === 0}
                        onClick={() => handleDelete()}
                        title="Delete Selected"
                      >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
                  <div className="px-2 py-2 md:px-4 md:py-3 bg-white dark:bg-slate-900 rounded-xl mb-2 flex items-center shadow">
                    <Breadcrumb>
                      <BreadcrumbList className="flex items-center gap-1">
              <BreadcrumbItem>
                          <BreadcrumbLink className="text-emerald-700 font-semibold transition cursor-pointer hover:no-underline" onClick={() => setCurrentPath([])}>
                            Home
                          </BreadcrumbLink>
              </BreadcrumbItem>
              {currentPath.map((folder, index) => (
                <React.Fragment key={index}>
                  <BreadcrumbSeparator>
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                              <BreadcrumbLink
                                className={`transition cursor-pointer ${index === currentPath.length - 1 ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
                                onClick={() => {
                                  // Optional: Add a slight delay before navigation if needed for smoother exit animations
                                  // setTimeout(() => {
                                    setCurrentPath(currentPath.slice(0, index + 1))
                                  // }, 100)
                                }}
                              >
                      {folder}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
                  </div>
        </div>

                <div className="flex-1 p-0 overflow-hidden flex flex-col justify-between">
                  {/* Upload Progress Bar */}
                  {isUploading && Object.keys(uploadProgress).length > 0 && (
                    <div className="w-full h-2 mb-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-emerald-500 transition-all"
                        style={{ width: `${
                          Math.min(
                            100,
                            Object.values(uploadProgress).reduce((a, b) => a + b, 0) /
                              Object.keys(uploadProgress).length
                          )
                        }%` }}
                      />
                    </div>
                  )}
                  <div className="flex-1 flex flex-col overflow-y-auto">
                    <AnimatePresence mode="wait">
                      <MotionTable
                        key={currentPath.join('/')} // Animate when path changes
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="shadow-none bg-white dark:bg-slate-900 h-full"
                        style={{ borderCollapse: 'separate', borderSpacing: 0 }}
                      >
                        <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
              <TableRow>
                            <TableHead className="w-[35px] pl-3 pr-0 py-1.5">
                  <input
                    type="checkbox"
                                checked={selectedItems.length === getCurrentFolderItems().length}
                    onChange={handleSelectAll}
                                className="h-4 w-4 rounded border-gray-300"
                  />
                </TableHead>
                            <TableHead className="pl-1 py-3">
                              File Name
                            </TableHead>
                            <TableHead>
                              Size
                            </TableHead>
                            <TableHead>
                              Modified
                            </TableHead>
                            <TableHead className="text-right pr-4">
                              Actions
                            </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                          {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                              <tr key={i} className={`${i % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                <td colSpan={5}>
                                  <div className="flex items-center py-3 px-3 animate-pulse">
                                    <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded mr-4"></div>
                                    <div className="flex items-center">
                                      <div className="h-6 w-6 bg-slate-300 dark:bg-slate-600 rounded mr-2"></div>
                                      <div className="h-4 w-36 bg-slate-300 dark:bg-slate-600 rounded"></div>
                                    </div>
                                    <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div>
                                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mx-4"></div>
                                    <div className="h-6 w-8 bg-slate-300 dark:bg-slate-600 rounded-full ml-auto"></div>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : getCurrentFolderItems().length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-24 px-6 text-center">
                                <div className="flex flex-col items-center justify-center gap-4">
                                  <FolderX className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                                  <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                                    No files in this folder
                                  </p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <AnimatePresence mode="popLayout" initial={false}>
              {getCurrentFolderItems().map((item, index) => (
                                <motion.tr
                  key={`${item.id}-${item.name}-${index}`}
                                  layout
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.25, type: "spring", damping: 20, stiffness: 200 }}
                                  className={`
                                    ${index % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900' : 'bg-slate-100 dark:bg-slate-800'}
                                    hover:bg-emerald-50 dark:hover:bg-emerald-900 hover:shadow-xl hover:scale-[1.01]
                                    ${selectedItems.includes([...currentPath, item.name].join('/')) ? 'bg-blue-50 dark:bg-blue-950' : ''}
                                    transition-all duration-150
                                  `}
                                  style={{ height: '52px', paddingTop: '10px', paddingBottom: '10px', cursor: 'pointer' }}
                >
                  <TableCell className="w-[35px] pl-3 pr-0 py-1.5">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes([...currentPath, item.name].join('/'))}
                      onChange={() => handleSelectItem(item.name)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </TableCell>
                                  <TableCell className="pl-1 py-3">
                    {renamingItem && getItemUniqueId(renamingItem) === getItemUniqueId(item) ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          ref={renameInputRef}
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          className="w-60"
                          autoFocus
                        />
                        <Button 
                          size="sm" 
                          onClick={handleSubmitRename}
                          variant="default"
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={handleCancelRename}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      item.type === "folder" ? (
                        <DroppableFolderItem 
                          folder={item}
                          onFileDrop={handleFileDrop}
                        >
                          <div onClick={() => navigateToFolder(item.name)} className="flex items-center cursor-pointer">
                            {getFileIcon(item.name, item.type)}
                            <span className="ml-1 font-medium">
                              {item.name}
                            </span>
                          </div>
                        </DroppableFolderItem>
                      ) : (
                        <DraggableFileItem 
                          file={item}
                          onFileToFileDrop={handleFileToFileDrop}
                        >
                          <div className="flex items-center">
                            {getFileIcon(item.name, item.type)}
                            <span className="ml-1 cursor-default">
                              {item.name}
                                              {getFileTypeBadge(item.name)}
                            </span>
                          </div>
                        </DraggableFileItem>
                      )
                    )}
                  </TableCell>
                  <TableCell>{formatFileSize(item.size)}</TableCell>
                  <TableCell>
                    {typeof item.modified === 'string'
                      ? new Date(item.modified).toLocaleDateString()
                      : item.modified instanceof Date
                        ? item.modified.toLocaleDateString()
                        : new Date().toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-1">
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

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" title="More actions" className="group">
                                            <MoreVertical className="w-4 h-4 transition-transform duration-200 ease-in-out group-hover:rotate-90" />
                          </Button>
                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl shadow-lg p-2 min-w-[180px] bg-white dark:bg-slate-900 border-none">
                                          {item.type === "file" && (
                                            <DropdownMenuItem 
                                              className="rounded-lg px-4 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900 transition" 
                                              onClick={async () => { // Make onClick async
                                                console.log("Preview clicked for:", item);
                                                // --- Start Pre-fetch ---
                                                try {
                                                  const filePath = [...(item.path || []), item.name].join('/');
                                                  const { url } = await documentsApi.getDownloadUrl(filePath);
                                                  const extension = item.name.split('.').pop()?.toLowerCase();
                                                  let targetUrl = '';
                                                  
                                                  // Define targetUrl based on extension
                                                  if (['pdf', 'docx', 'pptx', 'csv'].includes(extension || '')) { 
                                                    // Google Docs Viewer 
                                                    const encodedUrl = encodeURIComponent(url);
                                                    const cacheBuster = new Date().getTime();
                                                    targetUrl = `https://docs.google.com/gview?url=${encodedUrl}&embedded=true&t=${cacheBuster}`;
                                                  } else if (['xlsx'].includes(extension || '')) {
                                                    // Microsoft viewer
                                                    const encodedUrl = encodeURIComponent(url);
                                                    targetUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
                                                  } else if (['jpg', 'png', 'gif', 'jpeg'].includes(extension || '')) {
                                                    // Direct image URL
                                                    targetUrl = url;
                                                  }
                                                  
                                                  // Attempt the prefetch if we have a URL
                                                  if (targetUrl) {
                                                    console.log('Prefetching URL:', targetUrl.substring(0, 100) + '...');
                                                    fetch(targetUrl, { mode: 'no-cors' }).catch(e => console.warn('Prefetch failed (expected for no-cors):', e));
                                                    
                                                    // --- Set state AFTER generating targetUrl ---
                                                    setUrlToPreview(targetUrl); // Store the final URL
                                                    setPreviewFile(item);
                                                    setIsPreviewOpen(true);
                                                    // -------------------------------------------
                                                  } else {
                                                    // Handle case where no preview is supported or URL failed
                                                    toast.error("Preview is not supported for this file type or failed to get URL.");
                                                  }
                                                } catch (err) {
                                                  console.error("Error getting download URL or preparing preview:", err);
                                                  toast.error("Could not prepare file preview.");
                                                  // Ensure dialog doesn't open if URL fetch failed
                                                  setUrlToPreview(null);
                                                  setPreviewFile(null);
                                                  setIsPreviewOpen(false);
                                                }
                                                // --- End Pre-fetch and URL Generation Logic ---
                                              }}
                                            >
                                              <Eye className="w-4 h-4 mr-2" />
                                              <span>Preview</span>
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem className="rounded-lg px-4 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900 transition" onClick={() => handleStartRename(item)}>
                            <Edit className="w-4 h-4 mr-2" />
                            <span>Rename</span>
                          </DropdownMenuItem>
                          {item.type === "file" && (
                            <DropdownMenuItem className="rounded-lg px-4 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900 transition" onClick={() => handleMoveItem(item)}>
                              <FolderInput className="w-4 h-4 mr-2" />
                              <span>Move to folder</span>
                            </DropdownMenuItem>
                          )}
                          {item.type === "file" && (
                            <DropdownMenuItem className="rounded-lg px-4 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900 transition" onClick={() => handleReUpload(item)}>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              <span>Re-upload</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              const fullPath = currentPath.length > 0
                                ? `${currentPath.join('/')}/${item.name}`
                                : item.name
                              handleDelete(fullPath)
                            }}
                                            className="rounded-lg px-4 py-2 font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900 hover:text-red-700 focus:text-red-700 transition"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                                </motion.tr>
              ))}
                            </AnimatePresence>
                          )}
            </TableBody>
                      </MotionTable>
                    </AnimatePresence>
                  </div>
        </div>
        {fileDetails && <FileDetailsDialog />}
        <Dialog open={isCreatingFolder} onOpenChange={(open: boolean) => !open && setIsCreatingFolder(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogDescription>
                Enter a name for the new folder that will contain the selected files.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Input
                  id="folderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="col-span-4"
                  placeholder="Folder name"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsCreatingFolder(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleCreateFolderAndMoveFiles}>
                Create Folder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <MoveFolderDialog
          isOpen={isMoveModalOpen}
          onOpenChange={setIsMoveModalOpen}
          item={itemToMove}
          onConfirmMove={handleConfirmMove}
          allFolders={allFoldersForMove}
        />
        
        {/* Add Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[60vw] h-[90vh] p-0 flex flex-col bg-slate-50 dark:bg-slate-900 rounded-xl">
            <DialogHeader className="p-4 border-b flex flex-row items-center justify-between bg-white dark:bg-slate-800 rounded-t-xl">
              <div className="flex items-center gap-3">
                {previewFile && getFileIcon(previewFile.name, previewFile?.type)}
                <div>
                  <DialogTitle className="flex items-center text-lg">{previewFile?.name}</DialogTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {previewFile && formatFileSize(previewFile.size)} • Last modified: {previewFile && (
                      typeof previewFile.modified === 'string'
                        ? new Date(previewFile.modified).toLocaleDateString()
                        : previewFile.modified instanceof Date
                          ? previewFile.modified.toLocaleDateString()
                          : new Date().toLocaleDateString()
                    )}
                  </p>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-hidden relative">
              {isLoadingPreview ? ( // Simplified loading state check
                <div className="flex flex-col justify-center items-center h-full bg-slate-100 dark:bg-slate-800 bg-opacity-50">
                  <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg flex flex-col items-center">
                    <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mb-4" />
                    <p className="text-slate-700 dark:text-slate-300 font-medium">Loading preview...</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">This might take a few moments</p>
                  </div>
                </div>
              ) : previewUrl ? (
                // Unified rendering for iframe/img based on previewUrl
                <div className="relative w-full h-full">
                  {/* Optional: Show loading overlay while iframe specifically is loading */}
                  {isIframeLoading && previewFile?.name.split('.').pop()?.toLowerCase() !== 'jpg' /* etc */ && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 dark:bg-slate-900/90">
                      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg flex flex-col items-center">
                        <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mb-4" />
                        <p className="text-slate-700 dark:text-slate-300 font-medium">Loading preview content...</p>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const extension = previewFile?.name.split('.').pop()?.toLowerCase();
                    if (['jpg', 'png', 'gif', 'jpeg'].includes(extension || '')) {
                      // Image rendering
                      return (
                        <div className="h-full w-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAEKADAAQAAAABAAAAEAAAAAAXnVPIAAAAHElEQVQ4EWNgYGD4z0AEYBxVMGoANmhUwIAJAAAkEQMT1I5BBQAAAABJRU5ErkJggg==')] p-2">
                          <img
                            src={previewUrl || ''}
                            alt="Preview"
                            className="max-w-full max-h-[calc(90vh-8rem)] object-contain shadow-lg rounded-lg"
                            onLoad={() => setIsIframeLoading(false)} // Use onLoad for images too
                            onError={() => setIsIframeLoading(false)}
                          />
                        </div>
                      );
                    } else {
                      // Iframe rendering (PDFs use native viewer, others use Google/Microsoft)
                      return (
                        <div className="relative w-full h-full">
                          <iframe
                            key={`preview-iframe-${loadAttempt}`} // Force iframe refresh on retry
                            src={previewUrl || ''}
                            width="100%"
                            height="100%"
                            style={{ border: 'none', background: '#f8fafc' }}
                            title={`Preview of ${previewFile?.name}`}
                            onLoad={() => {
                              setIsIframeLoading(false);
                              setIframeError(null); // Clear error on successful load
                            }}
                            onError={() => {
                              setIsIframeLoading(false);
                              setIframeError("The preview service (e.g., Google Docs Viewer) failed to load this document. Please try reloading.");
                            }}
                            className="rounded-b-xl"
                          />

                          {/* Display iframe error message */} 
                          {iframeError && (
                            <div className="absolute inset-0 flex flex-col justify-center items-center bg-slate-100/90 dark:bg-slate-800/90 p-4 z-10">
                              <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-lg text-center">
                                <FileX className="h-12 w-12 text-red-500 mx-auto mb-3" />
                                <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Preview Error</p>
                                <p className="text-slate-600 dark:text-slate-300 text-sm">{iframeError}</p>
                              </div>
                            </div>
                          )}

                          {/* Retry button for all iframe types */} 
                          {!isIframeLoading && !isRetrying && (
                            <div className="absolute bottom-4 right-4 z-20"> {/* Ensure retry button is above iframe content */}
                              <Button
                                size="sm"
                                variant="secondary"
                                className="bg-white/80 dark:bg-slate-800/80 shadow-lg hover:bg-white dark:hover:bg-slate-700"
                                onClick={handleRetry}
                                disabled={isRetrying}
                              >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                                {isRetrying ? 'Reloading...' : 'Reload Preview'}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    }
                  })()}
                </div>
              ) : (
                <div className="flex flex-col justify-center items-center h-full bg-slate-100 dark:bg-slate-800">
                  <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg flex flex-col items-center">
                    <FileX className="h-16 w-16 text-slate-400 mb-4" />
                    <p className="text-slate-700 dark:text-slate-300 font-medium">Preview not available</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                      This file type doesn't support preview.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentsPage