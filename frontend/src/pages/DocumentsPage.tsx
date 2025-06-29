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
  FileX,
  Database,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  SortAsc,
  SortDesc
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
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { ChunkResult, Chunk } from "@/lib/api/documents"
import DraggableFileItem from "@/components/documents/DraggableFileItem"
import DroppableFolderItem from "@/components/documents/DroppableFolderItem"
import { DragItem } from "@/lib/hooks/useDragDrop"
import { useFilesStore } from "@/lib/store/files-store"
import { motion, AnimatePresence } from "framer-motion"
import '@/styles/react-pdf/AnnotationLayer.css';
import '@/styles/react-pdf/TextLayer.css';

const MotionTable = motion(Table)

type Props = {}

const ALLOWED_FILE_TYPES = ".xlsx,.csv,.docx,.xml,.pdf"
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const getFileIcon = (filename: string, type?: string) => {
  if (type && (type.toLowerCase() === "folder" || type.toLowerCase() === "directory")) {
    return <Folder className="w-5 h-5 text-yellow-600" />
  }

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

export const getFileTypeBadge = (filename: string, chunked?: boolean) => {
  const badges = [];
  const nameParts = filename.split('.');
  const ext = nameParts.length > 1 ? nameParts.pop()?.toLowerCase() : undefined;

  // File type badge
  if (ext) {
    let color = 'bg-slate-200 text-slate-700';
    if (ext === 'pdf') color = 'bg-red-100 text-red-700';
    if (ext === 'docx' || ext === 'doc') color = 'bg-blue-100 text-blue-700';
    if (ext === 'xlsx' || ext === 'xls') color = 'bg-green-100 text-green-700';
    if (ext === 'csv') color = 'bg-green-50 text-green-700';
    badges.push(
      <span key="type" className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
        {ext.toUpperCase()}
      </span>
    );
  }

  // Chunked status badge
  if (chunked !== undefined) {
    const chunkedColor = chunked
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    badges.push(
      <span key="chunked" className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${chunkedColor}`}>
        {chunked ? 'Chunked' : 'Not Chunked'}
      </span>
    );
  }

  return badges.length > 0 ? badges : null;
};

export const formatFileSize = (bytes?: number | null) => {
  if (bytes === undefined || bytes === null) return "-";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes < k) return `${bytes} ${sizes[0]}`;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

interface FileInfo {
  id: string;
  file_path: string;
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
  const [renamingItem, setRenamingItem] = useState<FileItem | null>(null)
  const [newItemName, setNewItemName] = useState("")
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [filesToMove, setFilesToMove] = useState<{ fileId: string; filePath: string[] }[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false)
  const [itemsToMove, setItemsToMove] = useState<FileItem[]>([])
  const [allFoldersForMove, setAllFoldersForMove] = useState<FileItem[]>([])
  const [selectedMoveTargetPath, setSelectedMoveTargetPath] = useState<string[] | null>(null)
  const [localSelectedPath, setLocalSelectedPath] = useState<string[] | null>(null)

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [urlToPreview, setUrlToPreview] = useState<string | null>(null);

  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);

  const [isProcessingETL, setIsProcessingETL] = useState(false)

  // Sort and filter states
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified' | 'type'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'folder' | 'pdf' | 'excel' | 'word' | 'csv'>('all')
  const [processedFilter, setProcessedFilter] = useState<'all' | 'processed' | 'unprocessed'>('all')
  const [chunkedFilter, setChunkedFilter] = useState<'all' | 'chunked' | 'not-chunked'>('all')

  const getItemUniqueId = useCallback((item: FileItem) => {
    return [...(item.path || []), item.name].join('/');
  }, []);

  const getCurrentFolderItems = useCallback(() => {
    let filteredItems = files
      .filter((item) => JSON.stringify(item.path) === JSON.stringify(currentPath))
      .filter((item) => item.name !== '.folder')
      .filter((item) =>
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Apply file type filter
    if (fileTypeFilter !== 'all') {
      filteredItems = filteredItems.filter((item) => {
        if (fileTypeFilter === 'folder') {
          return item.type === 'folder';
        }
        if (item.type === 'folder') return false;
        
        const extension = item.name.split('.').pop()?.toLowerCase();
        switch (fileTypeFilter) {
          case 'pdf':
            return extension === 'pdf';
          case 'excel':
            return extension === 'xlsx' || extension === 'xls';
          case 'word':
            return extension === 'docx' || extension === 'doc';
          case 'csv':
            return extension === 'csv';
          default:
            return true;
        }
      });
    }

    // Apply processed filter
    if (processedFilter !== 'all' && fileTypeFilter !== 'folder') {
      filteredItems = filteredItems.filter((item) => {
        if (item.type === 'folder') return true; // Always show folders
        if (processedFilter === 'processed') {
          return item.processed === true;
        } else {
          return !item.processed;
        }
      });
    }

    // Apply chunked filter
    if (chunkedFilter !== 'all' && fileTypeFilter !== 'folder') {
      filteredItems = filteredItems.filter((item) => {
        if (item.type === 'folder') return true; // Always show folders
        if (chunkedFilter === 'chunked') {
          return item.chunked === true;
        } else {
          return item.chunked !== true;
        }
      });
    }

    // Apply sorting
    filteredItems.sort((a, b) => {
      // Always put folders first regardless of sort
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (b.type === 'folder' && a.type !== 'folder') return 1;

      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          break;
        case 'size':
          const aSize = a.size || 0;
          const bSize = b.size || 0;
          comparison = aSize - bSize;
          break;
        case 'modified':
          const aDate = a.modified ? (typeof a.modified === 'string' ? new Date(a.modified) : a.modified) : new Date(0);
          const bDate = b.modified ? (typeof b.modified === 'string' ? new Date(b.modified) : b.modified) : new Date(0);
          comparison = aDate.getTime() - bDate.getTime();
          break;
        case 'type':
          const aExt = a.name.split('.').pop()?.toLowerCase() || '';
          const bExt = b.name.split('.').pop()?.toLowerCase() || '';
          comparison = aExt.localeCompare(bExt);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filteredItems;
  }, [files, currentPath, searchQuery, fileTypeFilter, processedFilter, chunkedFilter, sortBy, sortOrder])

  useEffect(() => {
    const documentCount = files.filter(item =>
      item.type === "file" &&
      item.name !== '.folder' &&
      !item.name.startsWith('.')
    ).length;

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
      setFiles([])
    } finally {
      setIsLoading(false)
    }
  }, [currentPath])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Keyboard shortcuts for sorting and filtering
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if no input/textarea is focused and no modals are open
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        document.querySelector('[role="dialog"]')
      ) {
        return;
      }

      // Sort shortcuts
      if (event.key === '1') {
        setSortBy('name');
        event.preventDefault();
      } else if (event.key === '2') {
        setSortBy('size');
        event.preventDefault();
      } else if (event.key === '3') {
        setSortBy('modified');
        event.preventDefault();
      } else if (event.key === '4') {
        setSortBy('type');
        event.preventDefault();
      }
      
      // Toggle sort order with 'r' (reverse)
      if (event.key === 'r' || event.key === 'R') {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        event.preventDefault();
      }
      
      // Clear all filters with 'c'
      if (event.key === 'c' || event.key === 'C') {
        setFileTypeFilter('all');
        setProcessedFilter('all');
        setChunkedFilter('all');
        setSortBy('name');
        setSortOrder('asc');
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
          setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))
          await loadFiles()
          toast.success(`File ${file.name} uploaded successfully`)
        } catch (error) {
          console.error("File upload error:", error)
          toast.error(`Failed to upload file: ${file.name}`)
        }
      }
      toast.success(`Upload completed successfully`, { id: uploadToastId })
    } catch (error) {
      console.error("Overall file upload error:", error)
      toast.error("Failed during file upload(s)", { id: uploadToastId })
    } finally {
      setIsUploading(false)
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

    const toastId = toast.loading(`Creating folder "${name}"...`)

    try {
      await documentsApi.createFolder(name, currentPath)
      setIsLoading(true)
      setTimeout(async () => {
        await loadFiles()
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
        const itemName = itemPath.split('/').pop() || 'Item';
        const deleteToastId = toast.loading(`Deleting ${itemName}...`);
        await documentsApi.deleteFile(itemPath)
        setIsLoading(true)
        setTimeout(async () => {
          await loadFiles()
          setSelectedItems((prev) => prev.filter((id) => id !== itemPath))
          toast.success(`${itemName} deleted successfully`, { id: deleteToastId })
        }, 300)
      } else {
        const deleteToastId = toast.loading(`Deleting ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}...`);
        for (const path of selectedItems) {
          await documentsApi.deleteFile(path)
        }
        setIsLoading(true)
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
      const identifier = item.id || [...(item.path || []), item.name].join('/');
      const { url } = await documentsApi.getDownloadUrl(identifier);
      window.open(url, '_blank');
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  }

  const handleStartRename = (item: FileItem) => {
    setRenamingItem(item)
    setNewItemName(item.name)
    setTimeout(() => {
      if (renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
      }
    }, 100);
  }

  const handleCancelRename = () => {
    setRenamingItem(null)
    setNewItemName("")
  }

  const handleSubmitRename = useCallback(async () => {
    console.log("handleSubmitRename is called")
    console.log("renamingItem:", renamingItem)
    console.log("newItemName:", newItemName)

    if (!renamingItem || !newItemName.trim()) {
      console.log("Canceling rename - empty item or name")
      handleCancelRename();
      return;
    }

    if (newItemName === renamingItem.name) {
      console.log("Canceling rename - same name")
      handleCancelRename();
      return;
    }

    console.log("Starting rename API call...")
    const renameToastId = toast.loading(`Renaming "${renamingItem.name}" to "${newItemName}"...`);
    try {
      const fullPath = renamingItem.path.length > 0
        ? `${renamingItem.path.join('/')}/${renamingItem.name}`
        : renamingItem.name;
      console.log("Calling renameItem API with path:", fullPath, "newName:", newItemName)
      const response = await documentsApi.renameItem(fullPath, newItemName);
      console.log("Rename API response:", response)
      setIsLoading(true);
      setTimeout(async () => {
        await loadFiles();
        if (response.warning) {
          toast.warning(`Partial success: ${response.warning}`, {
            description: "New folder created, but the original folder may still exist",
            duration: 5000,
            id: renameToastId
          });
        } else {
          toast.success(`Renamed to ${newItemName}`, { id: renameToastId });
        }
      }, 300);
    } catch (error: any) {
      console.error("Rename error:", error);
      const errorMessage = error.response?.data?.error || "Rename failed";
      if (errorMessage.includes("already exists")) {
        toast.error(`Rename failed: A file or folder with the same name already exists`, { id: renameToastId });
      } else if (renamingItem.type === "folder") {
        toast.error(`Folder rename failed`, {
          description: "Please refresh the page to see the actual status, operation may be partially successful",
          id: renameToastId
        });
      } else {
        toast.error(`Rename failed: ${errorMessage}`, { id: renameToastId });
      }
      await loadFiles();
    }
    handleCancelRename();
  }, [renamingItem, newItemName, loadFiles]);

  useEffect(() => {
    if (!renamingItem) return;
    const timerId = setTimeout(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (renameInputRef.current && !renameInputRef.current.contains(e.target as Node)) {
          handleCancelRename(); // check if the input is clicked outside
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, 300);
    return () => {
      clearTimeout(timerId);
    };
  }, [renamingItem, handleCancelRename]); // check if the input is clicked outside

  const handleMoveItem = async (item: FileItem) => {
    try {
      const allItems = await documentsApi.listFiles([])
      const foldersOnly = allItems.filter(f => f.type === 'folder');
      
      // If trying to move a folder, filter out the folder itself and its subfolders
      // to prevent creating a cyclical folder structure
      let validFolders = foldersOnly;
      if (item.type === "folder") {
        const folderPath = [...item.path, item.name].join('/');
        validFolders = foldersOnly.filter(folder => {
          const targetPath = [...folder.path, folder.name].join('/');
          return !targetPath.startsWith(folderPath);
        });
      }
      
      setAllFoldersForMove(validFolders);
      setItemsToMove([item]);
      setLocalSelectedPath(null);
      setIsMoveModalOpen(true);
    } catch (error) {
      console.error("Error fetching folder structure for move:", error);
      toast.error("Could not load folder structure to move item.");
    }
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

  const handleFileDrop = async (droppedFile: DragItem, targetPath: string[]) => {
    try {
      const fileItem = files.find(
        (f) => f.id === droppedFile.id &&
          JSON.stringify(f.path) === JSON.stringify(droppedFile.path)
      )
      if (!fileItem) {
        toast.error("File not found")
        return
      }
      if (fileItem.type === "folder") {
        const targetPathStr = targetPath.join('/')
        const filePathStr = [...fileItem.path, fileItem.name].join('/')
        if (targetPathStr.startsWith(filePathStr)) {
          toast.error("Cannot move a folder into itself or its subdirectory")
          return
        }
      }
      const targetFolderName = targetPath[targetPath.length - 1] || 'Home'
      const toastId = toast.loading(`Moving ${fileItem.name} to ${targetFolderName}...`)
      const oldPathArray = [...fileItem.path, fileItem.name]
      const oldPath = oldPathArray.join('/')
      const newPath = [...targetPath, fileItem.name].join('/')
      console.log(`Moving ${oldPath} to ${newPath}`)
      const response = await documentsApi.renameItem(oldPath, newPath)
      if (response.success) {
        const updatedFileItem = {
          ...fileItem,
          path: targetPath
        }
        useFilesStore.getState().updateFile(fileItem.id, updatedFileItem)
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

  const handleFileToFileDrop = async (droppedFile: DragItem, targetFile: FileItem) => {
    try {
      if (droppedFile.id === targetFile.id) {
        return; // Cannot drop on itself
      }

      // Primary check: Ensure the dragged item and target item are in the same folder path.
      // The `droppedFile.path` comes from the drag source.
      // The `targetFile.path` is from the item in the current view.
      if (JSON.stringify(droppedFile.path) !== JSON.stringify(targetFile.path)) {
        toast.error("Cannot create folder from files in different directories.");
        return;
      }

      // If paths are the same, proceed to find the sourceFile in the current context.
      // This assumes `droppedFile` (if from the same path) exists in the `files` state.
      const sourceFile = files.find(
        (f) => f.id === droppedFile.id && 
               f.name === droppedFile.name && // Add name check for more robustness
               JSON.stringify(f.path) === JSON.stringify(droppedFile.path)
      );

      if (!sourceFile) {
        // This case should ideally not be hit if the above path check is sound
        // and `droppedFile` originated from the currently viewed `targetFile.path`.
        // However, it's a good fallback.
        toast.error("Source file details could not be verified in the current folder.");
        return;
      }

      // The original check (which is now redundant due to the primary check above but harmless)
      // if (JSON.stringify(sourceFile.path) !== JSON.stringify(targetFile.path)) {
      //   toast.error("Files must be in the same folder to create a new folder");
      //   return;
      // }

      setIsCreatingFolder(true);
      setNewFolderName("New Folder"); // Or derive from dropped/target files
      setFilesToMove([
        { fileId: sourceFile.id, filePath: [...sourceFile.path, sourceFile.name] },
        { fileId: targetFile.id, filePath: [...targetFile.path, targetFile.name] },
      ]);
    } catch (error) {
      console.error("Error in handleFileToFileDrop:", error);
      toast.error("Failed to prepare folder creation");
    }
  };

  const handleCreateFolderAndMoveFiles = async () => {
    if (!newFolderName.trim()) {
      toast.error("Please enter a folder name")
      return
    }
    if (filesToMove.length === 0) {
      setIsCreatingFolder(false)
      return
    }
    const toastId = toast.loading(`Creating folder "${newFolderName}" and moving files...`)
    try {
      const parentPath = filesToMove[0].filePath.slice(0, -1)
      await documentsApi.createFolder(newFolderName, parentPath)
      for (const file of filesToMove) {
        const oldPath = file.filePath.join('/')
        const newPath = [...parentPath, newFolderName, file.filePath[file.filePath.length - 1]].join('/')
        await documentsApi.renameItem(oldPath, newPath)
      }
      setIsCreatingFolder(false)
      setFilesToMove([])
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

  const handleMoveSelectedItems = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select files or folders to move");
      return;
    }

    try {
      const allItems = await documentsApi.listFiles([])
      const foldersOnly = allItems.filter(f => f.type === 'folder');
      
      // Find the corresponding FileItem objects for each selected path
      const selectedFileItems = selectedItems.map(path => {
        const name = path.split('/').pop() || '';
        const pathParts = path.split('/');
        pathParts.pop(); // Remove filename or folder name
        const itemPath = pathParts.length > 0 ? pathParts : [];
        
        return files.find(
          f => f.name === name && JSON.stringify(f.path) === JSON.stringify(itemPath)
        );
      }).filter(Boolean) as FileItem[];
      
      if (selectedFileItems.length === 0) {
        toast.error("No valid items found to move");
        return;
      }
      
      // Extract all folder paths from selected items
      const selectedFolderPaths: string[] = [];
      selectedFileItems.forEach(item => {
        if (item.type === 'folder') {
          const folderPath = [...item.path, item.name].join('/');
          selectedFolderPaths.push(folderPath);
        }
      });
      
      // Filter out any folder that is a subfolder of a selected folder
      // to prevent moving a folder into its own subfolder
      let validFolders = foldersOnly;
      if (selectedFolderPaths.length > 0) {
        validFolders = foldersOnly.filter(folder => {
          const targetPath = [...folder.path, folder.name].join('/');
          return !selectedFolderPaths.some(folderPath => 
            targetPath.startsWith(folderPath + '/') || targetPath === folderPath
          );
        });
      }
      
      setAllFoldersForMove(validFolders);
      setItemsToMove(selectedFileItems);
      setLocalSelectedPath(null);
      setIsMoveModalOpen(true);
    } catch (error) {
      console.error("Error fetching folder structure for move:", error);
      toast.error("Could not load folder structure to move items.");
    }
  }

  const MoveFolderDialog = ({
    isOpen,
    onOpenChange,
    items,
    onConfirmMove,
    allFolders,
  }: {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    items: FileItem[]
    onConfirmMove: (targetPath: string[]) => void
    allFolders: FileItem[]
  }) => {
    if (items.length === 0) return null
    const [localSelectedPath, setLocalSelectedPath] = useState<string[] | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const filteredFolders = useMemo(() => {
      if (!searchQuery) {
        return allFolders;
      }
      const lowerCaseQuery = searchQuery.toLowerCase();
      const matchedFolders = new Map<string, FileItem>();
      allFolders.forEach(folder => {
        if (folder.name.toLowerCase().includes(lowerCaseQuery)) {
          matchedFolders.set([...folder.path, folder.name].join('/'), folder);
          let currentPath = folder.path;
          while (currentPath.length > 0) {
            const parentPathStr = currentPath.join('/');
            const parentFolder = allFolders.find(f => [...f.path, f.name].join('/') === parentPathStr);
            if (parentFolder && !matchedFolders.has(parentPathStr)) {
              matchedFolders.set(parentPathStr, parentFolder);
            } else if (!parentFolder) {
              break;
            }
            currentPath = parentFolder.path;
          }
        }
      });
      return Array.from(matchedFolders.values());
    }, [allFolders, searchQuery]);
    const FolderTreeNode = ({
      folder,
      allFolders,
      filteredPaths,
      level = 0,
      onSelect,
      selectedPath,
      index,
    }: {
      folder: FileItem
      allFolders: FileItem[]
      filteredPaths: Set<string>
      level?: number
      onSelect: (path: string[]) => void
      selectedPath: string[] | null
      index: number
    }) => {
      const fullPath = [...folder.path, folder.name];
      const fullPathString = fullPath.join('/');
      const isVisible = !searchQuery || filteredPaths.has(fullPathString);
      if (!isVisible) return null;
      const childFolders = allFolders.filter(
        (f) => JSON.stringify(f.path) === JSON.stringify(fullPath)
      );
      const isSelected = JSON.stringify(fullPath) === JSON.stringify(selectedPath);
      const isEven = index % 2 === 0;
      return (
        <div key={folder.id || folder.name}>
          <div
            style={{ paddingLeft: `${level * 1.75}rem` }}
            className={`flex items-center p-1.5 rounded-sm cursor-pointer transition-colors duration-100 
              ${isEven ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-800'} 
              ${isSelected
                ? 'bg-emerald-100 dark:bg-emerald-900 border-l-4 border-emerald-600 dark:border-emerald-500 shadow-sm'
                : 'hover:bg-emerald-50 dark:hover:bg-emerald-900 border-l-4 border-transparent'}`}
            onClick={() => onSelect(fullPath)}
          >
            <Folder className={`w-4 h-4 mr-1.5 flex-shrink-0 ${isSelected ? 'text-emerald-600' : 'text-yellow-600'}`} />
            <span className={`truncate ${isSelected ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-medium'}`}>{folder.name}</span>
          </div>
          {childFolders.length > 0 && (
            <div className="mt-1">
              {childFolders.map((child, childIndex) => (
                <FolderTreeNode
                  key={child.id || child.name}
                  folder={child}
                  allFolders={allFolders}
                  filteredPaths={filteredPaths}
                  level={level + 1}
                  index={childIndex}
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
        // Check if any item is already in the target folder
        const itemsAlreadyInTargetFolder = items.filter(item => 
          JSON.stringify(item.path) === JSON.stringify(localSelectedPath)
        );
        
        if (itemsAlreadyInTargetFolder.length > 0) {
          if (items.length === 1) {
            toast.error("Cannot move item to its current folder.");
            return;
          } else if (itemsAlreadyInTargetFolder.length === items.length) {
            toast.error("All selected items are already in this folder.");
            return;
          } else {
            toast.warning(`${itemsAlreadyInTargetFolder.length} of ${items.length} items are already in this folder and will be skipped.`);
          }
        }
        
        onConfirmMove(localSelectedPath);
        onOpenChange(false);
      } else {
        toast.error("Please select a destination folder.")
      }
    }
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[525px]" data-testid="move-item-dialog">
          <DialogHeader>
            <DialogTitle aria-label="move-item-dialog-title">Move {items.length > 1 ? `${items.length} Items` : "Item"}</DialogTitle>
            <DialogDescription>
              Select a destination folder for {items.length > 1 
                ? `${items.length} selected items` 
                : <span className="font-semibold">{items[0].name}</span>}.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 pb-2">
            <Input
              type="text"
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md bg-slate-100 dark:bg-slate-700 shadow-inner border-slate-200 dark:border-slate-600 focus:ring-1 focus:ring-emerald-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="px-4 pb-4">
            <p className="text-sm text-muted-foreground mb-2">Select a folder from the list:</p>
            <ScrollArea className="h-52 border rounded-md p-3 bg-white dark:bg-slate-800">
              <div
                className={[
                  "flex items-center p-1.5 my-0.5 rounded-sm cursor-pointer transition-colors duration-100",
                  (localSelectedPath !== null && localSelectedPath.length === 0
                    ? "bg-emerald-100 dark:bg-emerald-900 border-l-4 border-emerald-600 dark:border-emerald-500 shadow-sm"
                    : "hover:bg-emerald-50 dark:hover:bg-emerald-900/50 border-l-4 border-transparent"),
                  (localSelectedPath !== null && localSelectedPath.length === 0
                    ? "text-emerald-700 dark:text-emerald-300 font-semibold" 
                    : "text-slate-700 dark:text-slate-300 font-medium")
                ].join(" ")}
                onClick={() => setLocalSelectedPath([])}
              >
                <FolderClosed className={`w-4 h-4 mr-1.5 flex-shrink-0 ${localSelectedPath !== null && localSelectedPath.length === 0 ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>Home</span>
              </div>
              <div className="border-b my-2 border-slate-200 dark:border-slate-700" />
              {allFolders
                .filter((f) => f.path.length === 0)
                .map((folder, index) => (
                  <FolderTreeNode
                    key={folder.id || folder.name}
                    folder={folder}
                    allFolders={allFolders}
                    filteredPaths={new Set(filteredFolders.map(f => [...f.path, f.name].join('/')))}
                    level={0}
                    index={index}
                    onSelect={setLocalSelectedPath}
                    selectedPath={localSelectedPath}
                  />
                ))}
            </ScrollArea>
          </div>
          <div className="px-4 pb-2">
            <p className="text-sm text-muted-foreground mb-1">Selected destination:</p>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
              {localSelectedPath === null ? (
                <span className="text-slate-500 dark:text-slate-400 italic">No folder selected</span>
              ) : localSelectedPath.length === 0 ? (
                <div className="flex items-center">
                  <FolderClosed className="w-4 h-4 mr-1.5 text-emerald-600 flex-shrink-0" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">Home</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <Folder className="w-4 h-4 mr-1.5 text-emerald-600 flex-shrink-0" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    {localSelectedPath.join(' / ')}
                  </span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={localSelectedPath === null} 
              className={localSelectedPath !== null ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {items.length > 1 
                ? `Move ${items.length} Items Here` 
                : "Move Here"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const handleConfirmMove = useCallback(async (targetPath: string[]) => {
    if (itemsToMove.length === 0) return;
    
    // Check if any folder is being moved into itself or a subfolder
    const invalidFolderMoves = itemsToMove.filter(item => {
      if (item.type === 'folder') {
        const sourcePath = [...item.path, item.name].join('/');
        const targetPathStr = targetPath.join('/');
        
        // Check if target is inside source folder (would create loop)
        return targetPathStr.startsWith(sourcePath + '/') || targetPathStr === sourcePath;
      }
      return false;
    });
    
    if (invalidFolderMoves.length > 0) {
      if (invalidFolderMoves.length === 1) {
        toast.error(`Cannot move folder "${invalidFolderMoves[0].name}" into itself or its subfolder`);
      } else {
        toast.error(`Cannot move folders into themselves or their subfolders`);
      }
      return;
    }
    
    const toastId = toast.loading(`Moving ${itemsToMove.length > 1 ? `${itemsToMove.length} items` : itemsToMove[0].name}...`);
    let successCount = 0;
    let failCount = 0;
    
    try {
      // Process each item to move
      for (const item of itemsToMove) {
        // Skip items already in the target folder
        if (JSON.stringify(item.path) === JSON.stringify(targetPath)) {
          continue;
        }
        
        const oldPath = [...item.path, item.name].join('/');
        const newPath = [...targetPath, item.name].join('/');
        
        try {
          await documentsApi.renameItem(oldPath, newPath);
          successCount++;
        } catch (error) {
          console.error(`Error moving item ${item.name}:`, error);
          failCount++;
        }
      }
      
      // Show appropriate toast message based on results
      if (failCount === 0) {
        toast.success(`Moved ${successCount} item${successCount !== 1 ? 's' : ''} successfully`, { id: toastId });
      } else if (successCount === 0) {
        toast.error(`Failed to move any items`, { id: toastId });
      } else {
        toast.warning(`Moved ${successCount} item${successCount !== 1 ? 's' : ''}, but failed to move ${failCount} item${failCount !== 1 ? 's' : ''}`, { id: toastId });
      }
      
      await loadFiles();
      setSelectedItems([]);
    } catch (error) {
      console.error("Error moving items:", error);
      toast.error(`Failed to complete move operation`, { id: toastId });
    } finally {
      setItemsToMove([]);
      setIsMoveModalOpen(false);
    }
  }, [itemsToMove, loadFiles, setItemsToMove, setIsMoveModalOpen, setSelectedItems]);

  useEffect(() => {
    if (isPreviewOpen && previewFile && urlToPreview) {
      setIsLoadingPreview(true);
      setIsIframeLoading(true);
      setIframeError(null);
      setPreviewUrl(urlToPreview);
      setIsLoadingPreview(false);
      setTimeout(() => {
        setIsIframeLoading(false);
      }, 5000);
    } else if (!isPreviewOpen) {
      setPreviewUrl(null);
      setLoadAttempt(0);
      setIsRetrying(false);
      setIframeError(null);
      setUrlToPreview(null);
    }
  }, [isPreviewOpen, previewFile, loadAttempt, urlToPreview]);

  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    setLoadAttempt(prev => prev + 1);
  }, []);

  const handleETLProcess = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select files to process")
      return
    }

    setIsProcessingETL(true)
    const toastId = toast.loading(`Processing ${selectedItems.length} file(s) for ETL...`)

    try {
      const results = await Promise.allSettled(
        selectedItems.map(async (filePath) => {
          try {
            // Get the file ID from the selected files
            const selectedFiles: FileInfo[] = files.map(f => ({
              id: f.id,
              file_path: `${f.path.join("/")}/${f.name}`.replace(/^\//, "")
            }))
            const fileId = selectedFiles.find(f => f.file_path === filePath)?.id
            if (!fileId) {
              throw new Error(`Could not find file ID for path: ${filePath}`)
            }
            // Process the file using its storage path and ID
            const result = await documentsApi.processFile(filePath, fileId)
            return { filePath, result }
          } catch (error) {
            console.error(`Error processing file ${filePath}:`, error)
            throw error
          }
        })
      )

      // Count successes and failures
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (failed === 0) {
        toast.success(`Successfully processed ${succeeded} file(s)`, { id: toastId })
      } else if (succeeded === 0) {
        toast.error(`Failed to process ${failed} file(s)`, { id: toastId })
      } else {
        toast.warning(`Processed ${succeeded} file(s), ${failed} failed`, { id: toastId })
      }

      // Refresh the file list to show updated processing status
      await loadFiles()
      setSelectedItems([])
    } catch (error) {
      console.error("ETL processing error:", error)
      toast.error("Failed to process files", { id: toastId })
    } finally {
      setIsProcessingETL(false)
    }
  }

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
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Sort Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="shadow-sm transition-transform hover:scale-105" title="Sort Files">
                            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4 mr-1" /> : <SortDesc className="w-4 h-4 mr-1" />}
                            Sort
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                          <DropdownMenuRadioGroup value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                            <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="size">Size</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="modified">Modified Date</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="type">File Type</DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Order</DropdownMenuLabel>
                          <DropdownMenuRadioGroup value={sortOrder} onValueChange={(value) => setSortOrder(value as typeof sortOrder)}>
                            <DropdownMenuRadioItem value="asc">
                              <ArrowUp className="w-4 h-4 mr-2" />
                              Ascending
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="desc">
                              <ArrowDown className="w-4 h-4 mr-2" />
                              Descending
                            </DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Filter Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="shadow-sm transition-transform hover:scale-105" title="Filter Files">
                            <Filter className="w-4 h-4 mr-1" />
                            Filter
                            {(fileTypeFilter !== 'all' || processedFilter !== 'all' || chunkedFilter !== 'all') && (
                              <span className="ml-1 h-2 w-2 bg-emerald-500 rounded-full"></span>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>File Type</DropdownMenuLabel>
                          <DropdownMenuRadioGroup value={fileTypeFilter} onValueChange={(value) => setFileTypeFilter(value as typeof fileTypeFilter)}>
                            <DropdownMenuRadioItem value="all">All Types</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="folder">
                              <Folder className="w-4 h-4 mr-2" />
                              Folders
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="pdf">
                              <FileCheck className="w-4 h-4 mr-2" />
                              PDF Files
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="excel">
                              <FileSpreadsheet className="w-4 h-4 mr-2" />
                              Excel Files
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="word">
                              <FileText className="w-4 h-4 mr-2" />
                              Word Documents
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="csv">
                              <FileType className="w-4 h-4 mr-2" />
                              CSV Files
                            </DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Processing Status</DropdownMenuLabel>
                          <DropdownMenuRadioGroup value={processedFilter} onValueChange={(value) => setProcessedFilter(value as typeof processedFilter)}>
                            <DropdownMenuRadioItem value="all">All Files</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="processed">Processed Only</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="unprocessed">Unprocessed Only</DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Chunking Status</DropdownMenuLabel>
                          <DropdownMenuRadioGroup value={chunkedFilter} onValueChange={(value) => setChunkedFilter(value as typeof chunkedFilter)}>
                            <DropdownMenuRadioItem value="all">All Files</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="chunked">Chunked Only</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="not-chunked">Not Chunked</DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setFileTypeFilter('all');
                            setProcessedFilter('all');
                            setChunkedFilter('all');
                          }}>
                            Clear All Filters
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Input
                        type="file"
                        multiple
                        className="hidden"
                        id="file-upload"
                        onChange={handleFileUpload}
                        accept={ALLOWED_FILE_TYPES}
                      />
                      <label htmlFor="file-upload" title="Upload Files">
                        <Button variant="outline" size="sm" className="cursor-pointer shadow-sm transition-transform hover:scale-105" asChild>
                          <span>
                            {isUploading ? (
                              <Loader2 className="w-4 h-4 mr-1" />
                            ) : (
                              <Upload className="w-4 h-4 mr-1" />
                            )}
                            Upload
                          </span>
                        </Button>
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`shadow-sm transition-transform hover:scale-105 ${selectedItems.length > 0 ? 'bg-emerald-50 hover:bg-emerald-100' : ''}`}
                        onClick={handleETLProcess}
                        disabled={selectedItems.length === 0 || isProcessingETL}
                        title="Process ETL"
                      >
                        {isProcessingETL ? (
                          <Loader2 className="w-4 h-4 mr-1" />
                        ) : (
                          <Database className="w-4 h-4 mr-1" />
                        )}
                        Process ETL
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`shadow-sm transition-transform hover:scale-105 ${selectedItems.length > 0 ? 'bg-emerald-50 hover:bg-emerald-100' : ''}`}
                        onClick={handleMoveSelectedItems}
                        disabled={selectedItems.length === 0}
                        title="Move Selected Files and Folders"
                      >
                        <FolderInput className="w-4 h-4 mr-1" />
                        Move
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="shadow-sm transition-transform hover:scale-105" title="Create New Folder">
                            <FolderOpen className="w-4 h-4 mr-1" />
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
                        size="sm"
                        className={`${selectedItems.length === 0 ? "shadow-sm" : "shadow-sm bg-red-600 text-white hover:bg-red-700"} transition-transform hover:scale-105`}
                        disabled={selectedItems.length === 0}
                        onClick={() => handleDelete()}
                        title="Delete Selected"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="px-2 py-2 md:px-4 md:py-3 bg-white dark:bg-slate-900 rounded-xl mb-2 shadow">
                    <div className="flex items-center justify-between">
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
                                    setCurrentPath(currentPath.slice(0, index + 1))
                                  }}
                                >
                                  {folder}
                                </BreadcrumbLink>
                              </BreadcrumbItem>
                            </React.Fragment>
                          ))}
                        </BreadcrumbList>
                      </Breadcrumb>
                      
                      {/* Active Filters Display */}
                      {(fileTypeFilter !== 'all' || processedFilter !== 'all' || chunkedFilter !== 'all' || sortBy !== 'name') && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Active:</span>
                          {sortBy !== 'name' && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                              Sort: {sortBy} ({sortOrder})
                            </span>
                          )}
                          {fileTypeFilter !== 'all' && (
                            <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                              Type: {fileTypeFilter}
                            </span>
                          )}
                          {processedFilter !== 'all' && (
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                              Status: {processedFilter}
                            </span>
                          )}
                          {chunkedFilter !== 'all' && (
                            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
                              Chunked: {chunkedFilter === 'chunked' ? 'Yes' : 'No'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-1 p-0 overflow-hidden flex flex-col justify-between">
                  {isUploading && Object.keys(uploadProgress).length > 0 && (
                    <div className="w-full h-2 mb-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-emerald-500 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Object.values(uploadProgress).reduce((a, b) => a + b, 0) /
                            Object.keys(uploadProgress).length
                          )
                            }%`
                        }}
                      />
                    </div>
                  )}
                  
                  {/* File Statistics */}
                  {!isLoading && (
                    <div className="flex items-center justify-between px-2 py-1 text-sm text-slate-500 dark:text-slate-400">
                      <div>
                        Showing {getCurrentFolderItems().length} of {files.filter((item) => 
                          JSON.stringify(item.path) === JSON.stringify(currentPath) && item.name !== '.folder'
                        ).length} items
                        {(fileTypeFilter !== 'all' || processedFilter !== 'all' || chunkedFilter !== 'all') && (
                          <span className="ml-2 text-emerald-600 dark:text-emerald-400">(filtered)</span>
                        )}
                      </div>
                      <div className="flex gap-4">
                        {getCurrentFolderItems().filter(item => item.type === 'folder').length > 0 && (
                          <span>{getCurrentFolderItems().filter(item => item.type === 'folder').length} folder{getCurrentFolderItems().filter(item => item.type === 'folder').length !== 1 ? 's' : ''}</span>
                        )}
                        {getCurrentFolderItems().filter(item => item.type === 'file').length > 0 && (
                          <span>{getCurrentFolderItems().filter(item => item.type === 'file').length} file{getCurrentFolderItems().filter(item => item.type === 'file').length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex-1 flex flex-col overflow-y-auto">
                    <AnimatePresence mode="wait">
                      <MotionTable
                        key={currentPath.join('/')}
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
                                aria-label="Select all documents"
                                checked={selectedItems.length === getCurrentFolderItems().length}
                                onChange={handleSelectAll}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </TableHead>
                            <TableHead className="pl-1 py-3">
                              <button
                                className="flex items-center gap-1 hover:text-emerald-600 transition-colors font-semibold"
                                onClick={() => {
                                  if (sortBy === 'name') {
                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortBy('name');
                                    setSortOrder('asc');
                                  }
                                }}
                              >
                                File Name
                                {sortBy === 'name' && (
                                  sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                className="flex items-center gap-1 hover:text-emerald-600 transition-colors font-semibold"
                                onClick={() => {
                                  if (sortBy === 'size') {
                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortBy('size');
                                    setSortOrder('desc'); // Default to largest first for size
                                  }
                                }}
                              >
                                Size
                                {sortBy === 'size' && (
                                  sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                className="flex items-center gap-1 hover:text-emerald-600 transition-colors font-semibold"
                                onClick={() => {
                                  if (sortBy === 'modified') {
                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortBy('modified');
                                    setSortOrder('desc'); // Default to newest first for dates
                                  }
                                }}
                              >
                                Modified
                                {sortBy === 'modified' && (
                                  sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                                )}
                              </button>
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
                                  aria-label={item.name}
                                  role="row"
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
                                    {item.type === "folder" ? (
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
                                            {getFileTypeBadge(item.name, item.chunked)}
                                          </span>
                                        </div>
                                      </DraggableFileItem>
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
                                          <Button variant="ghost" size="icon" title="More actions" aria-label="more-actions" className="group">
                                            <MoreVertical className="w-4 h-4 transition-transform duration-200 ease-in-out group-hover:rotate-90" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl shadow-lg p-2 min-w-[180px] bg-white dark:bg-slate-900 border-none">
                                          {item.type === "file" && (
                                            <DropdownMenuItem
                                              className="rounded-lg px-4 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900 transition"
                                              onClick={async () => {
                                                console.log("Preview clicked for:", item);
                                                try {
                                                  const filePath = [...(item.path || []), item.name].join('/');
                                                  const { url } = await documentsApi.getDownloadUrl(filePath);
                                                  const extension = item.name.split('.').pop()?.toLowerCase();
                                                  let targetUrl = '';
                                                  if (['pdf', 'docx', 'pptx', 'csv'].includes(extension || '')) {
                                                    const encodedUrl = encodeURIComponent(url);
                                                    const cacheBuster = new Date().getTime();
                                                    targetUrl = `https://docs.google.com/gview?url=${encodedUrl}&embedded=true&t=${cacheBuster}`;
                                                  } else if (['xlsx'].includes(extension || '')) {
                                                    const encodedUrl = encodeURIComponent(url);
                                                    targetUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
                                                  } else if (['jpg', 'png', 'gif', 'jpeg'].includes(extension || '')) {
                                                    targetUrl = url;
                                                  }
                                                  if (targetUrl) {
                                                    console.log('Prefetching URL:', targetUrl.substring(0, 100) + '...');
                                                    fetch(targetUrl, { mode: 'no-cors' }).catch(e => console.warn('Prefetch failed (expected for no-cors):', e));
                                                    setUrlToPreview(targetUrl);
                                                    setPreviewFile(item);
                                                    setIsPreviewOpen(true);
                                                  } else {
                                                    toast.error("Preview is not supported for this file type or failed to get URL.");
                                                  }
                                                } catch (err) {
                                                  console.error("Error getting download URL or preparing preview:", err);
                                                  toast.error("Could not prepare file preview.");
                                                  setUrlToPreview(null);
                                                  setPreviewFile(null);
                                                  setIsPreviewOpen(false);
                                                }
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
                                          <DropdownMenuItem 
                                            role="menuitem"
                                            aria-label="move-to-folder"
                                            className="rounded-lg px-4 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900 transition" 
                                            onClick={() => handleMoveItem(item)}
                                          >
                                            <FolderInput className="w-4 h-4 mr-2" />
                                            <span>Move to folder</span>
                                          </DropdownMenuItem>
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
                  items={itemsToMove}
                  onConfirmMove={handleConfirmMove}
                  allFolders={allFoldersForMove}
                />
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
                      {isLoadingPreview ? (
                        <div className="flex flex-col justify-center items-center h-full bg-slate-100 dark:bg-slate-800 bg-opacity-50">
                          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg flex flex-col items-center">
                            <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mb-4" />
                            <p className="text-slate-700 dark:text-slate-300 font-medium">Loading preview...</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">This might take a few moments</p>
                          </div>
                        </div>
                      ) : previewUrl ? (
                        <div className="relative w-full h-full">
                          {isIframeLoading && previewFile?.name.split('.').pop()?.toLowerCase() !== 'jpg' && (
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
                              return (
                                <div className="h-full w-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAEKADAAQAAAABAAAAEAAAAAAXnVPIAAAAHElEQVQ4EWNgYGD4z0AEYBxVMGoANmhUwIAJAAAkEQMT1I5BBQAAAABJRU5ErkJggg==')] p-2">
                                  <img
                                    src={previewUrl || ''}
                                    alt="Preview"
                                    className="max-w-full max-h-[calc(90vh-8rem)] object-contain shadow-lg rounded-lg"
                                    onLoad={() => setIsIframeLoading(false)}
                                    onError={() => setIsIframeLoading(false)}
                                  />
                                </div>
                              );
                            } else {
                              return (
                                <div className="relative w-full h-full">
                                  <iframe
                                    key={`preview-iframe-${loadAttempt}`}
                                    src={previewUrl || ''}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 'none', background: '#f8fafc' }}
                                    title={`Preview of ${previewFile?.name}`}
                                    onLoad={() => {
                                      setIsIframeLoading(false);
                                      setIframeError(null);
                                    }}
                                    onError={() => {
                                      setIsIframeLoading(false);
                                      setIframeError("The preview service (e.g., Google Docs Viewer) failed to load this document. Please try reloading.");
                                    }}
                                    className="rounded-b-xl"
                                  />
                                  {iframeError && (
                                    <div className="absolute inset-0 flex flex-col justify-center items-center bg-slate-100/90 dark:bg-slate-800/90 p-4 z-10">
                                      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-lg text-center">
                                        <FileX className="h-12 w-12 text-red-500 mx-auto mb-3" />
                                        <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Preview Error</p>
                                        <p className="text-slate-600 dark:text-slate-300 text-sm">{iframeError}</p>
                                      </div>
                                    </div>
                                  )}
                                  {!isIframeLoading && !isRetrying && (
                                    <div className="absolute bottom-4 right-4 z-20">
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
                <Dialog open={!!renamingItem} onOpenChange={(open) => !open && handleCancelRename()}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Rename {renamingItem?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
                      <DialogDescription>
                        Enter a new name for {renamingItem?.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Input
                          id="rename-input"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          className="col-span-4"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSubmitRename();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              handleCancelRename();
                            }
                          }}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={handleCancelRename}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmitRename}>
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="mt-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
            <div className="flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border text-xs">1-4</kbd>
                Sort by column
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border text-xs">R</kbd>
                Reverse order
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border text-xs">C</kbd>
                Clear filters
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentsPage