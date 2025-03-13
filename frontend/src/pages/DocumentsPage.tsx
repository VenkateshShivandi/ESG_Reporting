"use client"

import React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
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
  Edit,
  MoreVertical,
  FileImage,
  Eye,
  Calendar
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
import type { FileItem, UploadProgress } from "@/lib/types/documents"
import supabase from "@/lib/supabase/client"
import type { ProcessedFileResult } from "@/lib/types/documents"

type Props = {}

const ALLOWED_FILE_TYPES = ".xlsx,.csv,.docx,.xml,.pdf"
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Function to format file size
const formatFileSize = (bytes?: number) => {
  if (!bytes) return "-";
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

// Function to get the appropriate icon based on file extension
const getFileIcon = (filename: string, type: string) => {
  if (type === "folder") {
    return <FolderClosed className="w-5 h-5 text-yellow-600" />
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
  
  // New state variables for context menu and rename functionality
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem | null }>({ x: 0, y: 0, item: null })
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [itemToRename, setItemToRename] = useState<FileItem | null>(null)
  const [newFileName, setNewFileName] = useState("")
  const renameInputRef = useRef<HTMLInputElement>(null)

  const getCurrentFolderItems = useCallback(() => {
    return files.filter((item) => JSON.stringify(item.path) === JSON.stringify(currentPath))
  }, [files, currentPath])

  // Close the context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu({ x: 0, y: 0, item: null })
    document.removeEventListener('click', closeContextMenu)
  }, [])

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

  // Clean up event listeners when component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener('click', closeContextMenu)
    }
  }, [closeContextMenu])

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
      // If all items are selected, unselect all
      setSelectedItems([])
    } else {
      // Otherwise, select all items in the current folder
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

        // Validate file type and size (keeping existing validation)
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
          // Upload file to storage
          const { fileId: uploadedFileId } = await documentsApi.uploadFile(file, currentPath)
          setUploadProgress((prev) => ({ ...prev, [fileId]: 60 }))
          
          // Process the file
          await documentsApi.processFile(file)
          setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))
          
          // Refresh the file list
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
    // Validate folder name
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Please enter a folder name");
      return;
    }
    
    // Check for invalid characters in folder name
    // Disallow characters that could cause issues in paths: \/,:*?"<>|
    const invalidChars = /[\\/:*?"<>|]/;
    if (invalidChars.test(trimmedName)) {
      toast.error("Folder name contains invalid characters. Avoid: \\ / : * ? \" < > |");
      return;
    }

    // Check if folder already exists in current path
    if (files.some(item => 
      item.type === "folder" && 
      item.name.toLowerCase() === trimmedName.toLowerCase() && 
      JSON.stringify(item.path) === JSON.stringify(currentPath)
    )) {
      toast.error("A folder with this name already exists");
      return;
    }

    try {
      toast.loading("Creating folder...");
      await documentsApi.createFolder(trimmedName, currentPath);
      
      // Refresh the file list
      await loadFiles();
      toast.dismiss();
      toast.success(`Folder "${trimmedName}" created successfully`);
    } catch (error) {
      toast.dismiss();
      console.error("Error creating folder:", error);
      toast.error("Failed to create folder. Please try again.");
    }
  }

  const handleDelete = async (itemPath?: string) => {
    try {
      console.log('Starting delete operation for:', itemPath || 'selected items')
      
      if (itemPath) {
        // Single item delete
        console.log('Attempting to delete single item:', itemPath)
        await documentsApi.deleteFile(itemPath)
        console.log('Successfully deleted item:', itemPath)
        
        // Refresh the file list
        await loadFiles()
        setSelectedItems((prev) => prev.filter((id) => id !== itemPath))
        toast.success("Item deleted successfully")
      } else {
        // Multiple items delete
        console.log('Attempting to delete multiple items:', selectedItems)
        for (const path of selectedItems) {
          await documentsApi.deleteFile(path)
          console.log('Successfully deleted item:', path)
        }
        
        // Refresh the file list
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
      
      // If we have a local file, use it directly
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
        // Use the downloaded URL
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Failed to download file")
    }
  }

  const handleViewFileDetails = async (item: FileItem) => {
    try {
      // Show different loading toast based on item type
      toast.loading(item.type === "folder" ? "Loading folder details..." : "Loading file details...");
      
      let itemResult: ProcessedFileResult = {
        type: item.type,
        filename: item.name,
        size: item.type === "file" ? (item.size || 0) : undefined, // Only set size for files
        processed_at: new Date().toISOString()
      };
      
      // Create a metadata object to store additional information
      let itemMetadata: {
        title?: string,
        author?: string,
        creation_date?: string,
        mimetype?: string,
        item_count?: number // For folders - count of contained items
      } = {};
      
      // Set creation date from the item's modified date
      if (item.modified instanceof Date) {
        itemMetadata.creation_date = item.modified.toISOString();
      } else {
        // If it's already a string or other format, convert it to a Date first
        try {
          const modifiedDate = new Date(item.modified);
          itemMetadata.creation_date = modifiedDate.toISOString();
        } catch (error) {
          console.error("Error converting modified date:", error);
          itemMetadata.creation_date = new Date().toISOString(); // Fallback to current date
        }
      }
      
      // Try to get the current user as the author if not already set
      try {
        const { data: { user } } = await supabase.auth.getUser();
        itemMetadata.author = user?.email || user?.user_metadata?.name || "ESG Reporting System";
      } catch (error) {
        console.error("Error getting user:", error);
        itemMetadata.author = "ESG Reporting System";
      }
      
      // Only set mimetype for files, not folders
      if (item.type === "file") {
        const extension = item.name.split('.').pop()?.toLowerCase();
        if (extension) {
          switch(extension) {
            case 'pdf':
              itemMetadata.mimetype = 'application/pdf';
              break;
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'gif':
              itemMetadata.mimetype = `image/${extension}`;
              break;
            case 'txt':
              itemMetadata.mimetype = 'text/plain';
              break;
            case 'csv':
              itemMetadata.mimetype = 'text/csv';
              break;
            case 'docx':
              itemMetadata.mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              break;
            case 'xlsx':
              itemMetadata.mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
              break;
            default:
              itemMetadata.mimetype = 'application/octet-stream';
          }
        }
      } else if (item.type === "folder") {
        // For folders, get the count of items inside if possible
        // But don't make a Supabase API call to avoid potential errors
        itemMetadata.item_count = 0; // Default value
      }
      
      // If there's existing processing result data, merge it with our new data
      if (item.processingResult) {
        itemResult = {
          ...item.processingResult,
          ...itemResult,
          metadata: {
            ...item.processingResult.metadata,
            ...itemMetadata
          }
        };
      } else {
        itemResult.metadata = itemMetadata;
      }
      
      // Dismiss the loading toast
      toast.dismiss();
      
      // Set the file details and show the dialog
      setFileDetails(itemResult);
      setShowFileDetails(true);
    } catch (error) {
      console.error("Error viewing details:", error);
      toast.dismiss();
      toast.error(item.type === "folder" ? "Failed to load folder details" : "Failed to load file details");
    }
  };
  
  // Helper function to get a signed URL for file viewing
  const getFileSignedUrl = async (file: FileItem): Promise<string | null> => {
    try {
      // Construct the path to the file
      const filePath = currentPath.length > 0 
        ? `${currentPath.join('/')}/${file.name}`
        : file.name;
      
      // Create a signed URL with 10-minute expiration
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 600);
      
      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }
      
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  };

  // Handler for showing the context menu
  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Position the context menu near the clicked element
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item: item
    })
    
    // Add a global click listener to close the menu when clicking elsewhere
    document.addEventListener('click', closeContextMenu)
  }
  
  // Open rename dialog from context menu
  const handleOpenRenameDialog = (item: FileItem) => {
    closeContextMenu();
    setItemToRename(item);
    setIsRenameDialogOpen(true);
  };
  
  // Modify the RenameDialog component to fix the empty name error on first click
  const RenameDialog = () => {
    // Create a local state for the input value to prevent glitching
    const [localNameValue, setLocalNameValue] = useState("");
    
    // Initialize the local state when the dialog opens
    useEffect(() => {
      if (isRenameDialogOpen && itemToRename) {
        if (itemToRename.type === "file") {
          const nameParts = itemToRename.name.split('.');
          if (nameParts.length > 1) {
            // Remove the extension for editing
            setLocalNameValue(nameParts.slice(0, -1).join('.'));
          } else {
            setLocalNameValue(itemToRename.name);
          }
        } else {
          // For folders, use the full name
          setLocalNameValue(itemToRename.name);
        }
        
        // Focus the input after the dialog opens and state is set
        setTimeout(() => {
          if (renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
          }
        }, 50);
      }
    }, [isRenameDialogOpen, itemToRename]);

    // Only render the dialog when it's open and we have an item to rename
    if (!isRenameDialogOpen || !itemToRename) return null;
    
    // Check if it's a file with an extension
    const isFile = itemToRename.type === "file";
    let extension = "";
    
    if (isFile) {
      const parts = itemToRename.name.split('.');
      if (parts.length > 1) {
        extension = `.${parts[parts.length - 1]}`;
      }
    }
    
    // Check for validation issues
    const trimmedName = localNameValue.trim();
    const isEmpty = trimmedName === "";
    const hasInvalidChars = /[\\/:*?"<>|]/.test(trimmedName);
    
    // Check for duplicate name
    let isDuplicate = false;
    if (trimmedName) {
      const fullNewName = isFile && extension 
        ? `${trimmedName}${extension}` 
        : trimmedName;
        
      isDuplicate = fullNewName !== itemToRename.name && 
        getCurrentFolderItems().some(item => 
          item.name.toLowerCase() === fullNewName.toLowerCase()
        );
    }
    
    // Check for same name
    let isSameName = false;
    if (trimmedName) {
      const fullNewName = isFile && extension 
        ? `${trimmedName}${extension}` 
        : trimmedName;
        
      isSameName = fullNewName === itemToRename.name;
    }
    
    // Disable submit button if there are validation issues
    const isDisabled = isEmpty || hasInvalidChars || isDuplicate || isSameName;
    
    // Handle input changes without triggering state changes in parent
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalNameValue(e.target.value);
    };
    
    // Handle key down for submit
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !isDisabled) {
        e.preventDefault();
        handleSubmit();
      }
    };
    
    // Modified handleSubmit to directly perform the rename with local state
    const handleSubmit = () => {
      if (isDisabled) return;
      
      // Extract the necessary values from local state
      const item = itemToRename;
      const newName = trimmedName;
      
      // Immediate validation
      if (!newName) {
        toast.error("Name cannot be empty");
        return;
      }
      
      if (hasInvalidChars) {
        toast.error("Name contains invalid characters. Avoid: \\ / : * ? \" < > |");
        return;
      }
      
      // Reconstruct the full filename with extension for files
      let fullNewName = newName;
      if (item.type === "file") {
        const oldNameParts = item.name.split('.');
        if (oldNameParts.length > 1) {
          const extension = oldNameParts[oldNameParts.length - 1];
          fullNewName = `${newName}.${extension}`;
        }
      }

      // Check if the new name is the same as the old name
      if (fullNewName === item.name) {
        toast.error("You must enter a different name");
        return;
      }
      
      // Check if the new name already exists in the current directory
      const existingItem = getCurrentFolderItems().find(i => 
        i.name.toLowerCase() === fullNewName.toLowerCase()
      );
      
      if (existingItem) {
        toast.error(`A ${item.type} with the name "${fullNewName}" already exists`);
        return;
      }
      
      // Make a new function to handle errors and provide a retry option
      const handleRenameError = (error: any) => {
        console.error('Rename error:', error);
        
        // Dismiss any existing toasts first
        toast.dismiss();
        
        // Display error with a retry button
        if (error.message) {
          toast.error(error.message, {
            duration: 5000,
            action: {
              label: "Retry",
              onClick: () => {
                toast.dismiss();
                // Wait a bit then try again
                setTimeout(handleSubmit, 500);
              }
            }
          });
        } else {
          toast.error(`Failed to rename ${item.type}. Please try again.`, {
            duration: 5000,
            action: {
              label: "Retry",
              onClick: () => {
                toast.dismiss();
                setTimeout(handleSubmit, 500);
              }
            }
          });
        }
      };
      
      // Show loading toast with unique ID for better tracking
      const toastId = `rename-${Date.now()}`;
      toast.loading(`Preparing to rename ${item.type}...`, { id: toastId });
      
      // Common post-success actions
      const handleRenameSuccess = () => {
        toast.dismiss(toastId);
        toast.success(`${item.type === 'folder' ? 'Folder' : 'File'} renamed successfully to "${fullNewName}"`, {
          duration: 3000
        });
        
        // Close dialog and reset state
        setIsRenameDialogOpen(false);
        setItemToRename(null);
        setNewFileName("");
        setLocalNameValue("");
      };
      
      // Handle folder rename
      if (item.type === "folder") {
        // Update toast for folders - they might take longer
        setTimeout(() => {
          toast.dismiss(toastId);
          toast.loading(
            "Renaming folder... This may take longer if it contains many files.",
            { id: toastId, duration: 60000 }
          );
        }, 1000);
        
        // Call the folder-specific rename method
        documentsApi.renameFolder(currentPath.join('/'), item.name, fullNewName)
          .then(() => loadFiles())
          .then(handleRenameSuccess)
          .catch(handleRenameError);
      } 
      // Handle file rename
      else {
        // Update toast for files
        setTimeout(() => {
          toast.dismiss(toastId);
          toast.loading("Renaming file...", { id: toastId, duration: 30000 });
        }, 1000);
        
        // Get the exact path string
        const pathString = currentPath.join('/');
        console.log(`📄 Starting file rename operation:`, {
          directory: pathString,
          oldName: item.name,
          newName: fullNewName
        });
        
        // Call the file-specific rename method with proper error handling
        documentsApi.renameFileItem(pathString, item.name, fullNewName)
          .then(() => {
            console.log('📄 File rename API call succeeded, refreshing files...');
            return loadFiles();
          })
          .then(handleRenameSuccess)
          .catch((error) => {
            // If we get an error about the file not being found
            if (error?.message?.includes('not found') || error?.message?.includes('does not exist')) {
              console.log('⚠️ File not found during rename, trying to refresh file list first...');
              
              // Try refreshing the file list first, then retry
              loadFiles()
                .then(() => {
                  // Check if the file still exists after refresh
                  const fileStillExists = getCurrentFolderItems().some(f => f.name === item.name);
                  
                  if (fileStillExists) {
                    console.log('✅ File found after refresh, retrying rename...');
                    // Wait a short delay then retry with the refreshed state
                    setTimeout(() => {
                      documentsApi.renameFileItem(pathString, item.name, fullNewName)
                        .then(() => loadFiles())
                        .then(handleRenameSuccess)
                        .catch(handleRenameError);
                    }, 1000);
                  } else {
                    // File doesn't exist anymore
                    console.error('❌ File not found even after refresh');
                    toast.dismiss(toastId);
                    toast.error(`The file "${item.name}" could not be found. It may have been deleted or moved.`);
                  }
                })
                .catch(() => {
                  // If refresh fails, just show the original error
                  handleRenameError(error);
                });
            } else {
              // For other types of errors
              handleRenameError(error);
            }
          });
      }
    };
    
    // Handle cancel
    const handleCancel = () => {
      setIsRenameDialogOpen(false);
      setItemToRename(null);
      setNewFileName("");
      setLocalNameValue("");
    };
    
    // Handle dialog close
    const handleOpenChange = (open: boolean) => {
      if (!open) {
        handleCancel();
      }
    };

    return (
      <Dialog 
        open={isRenameDialogOpen} 
        onOpenChange={handleOpenChange}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {isFile ? getFileIcon(itemToRename.name, "file") : <FolderClosed className="h-5 w-5 text-yellow-600" />}
              <span className="ml-2">Rename {isFile ? "File" : "Folder"}</span>
            </DialogTitle>
            <DialogDescription>
              Enter a new name for this {itemToRename.type}.
              {extension && (
                <span className="text-muted-foreground"> The extension {extension} will be preserved.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-2">
              <Input
                id="rename-input"
                ref={renameInputRef}
                value={localNameValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Enter new name"
                className={`flex-1 ${hasInvalidChars ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                autoComplete="off"
                spellCheck="false"
              />
              {extension && (
                <span className="text-sm text-gray-500 whitespace-nowrap">{extension}</span>
              )}
            </div>
            
            {/* Validation messages */}
            <div className="text-sm space-y-1">
              {isEmpty && (
                <p className="text-red-500">Name cannot be empty</p>
              )}
              
              {hasInvalidChars && (
                <p className="text-red-500">
                  Invalid characters detected. Please avoid: \ / : * ? " &lt; &gt; |
                </p>
              )}
              
              {isDuplicate && (
                <p className="text-red-500">
                  A {itemToRename.type} with this name already exists
                </p>
              )}
              
              {isSameName && (
                <p className="text-red-500">
                  You must enter a different name
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              type="button"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isDisabled}
              type="submit"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Add back the FileDetailsDialog component that was accidentally removed
  const FileDetailsDialog = () => {
    if (!fileDetails || !showFileDetails) return null;
    
    const isFolder = fileDetails.type === "folder";

    return (
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-30"
            onClick={() => setShowFileDetails(false)}></div>
          <div className="relative bg-white rounded-lg shadow-xl max-w-3xl max-h-[90vh] overflow-hidden w-full p-6">
            {/* Header with icon and title */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                {isFolder ? 
                  <FolderClosed className="w-6 h-6 text-yellow-600 mr-2" /> : 
                  getFileIcon(fileDetails.filename, "file")
                }
                <span className="ml-2">{fileDetails.filename} Details</span>
              </h2>
              <button
                onClick={() => setShowFileDetails(false)}
                className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Two-column layout */}
                  <div className="grid grid-cols-2 gap-4">
              {/* Left column - File Information */}
              <div>
                      <h3 className="font-medium mb-2">File Information</h3>
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="py-2">Type:</td>
                      <td className="text-right font-medium">{isFolder ? "FOLDER" : "FILE"}</td>
                    </tr>
                    
                    {!isFolder && (
                      <>
                        <tr>
                          <td className="py-2">Size:</td>
                          <td className="text-right font-medium">
                            {formatFileSize(fileDetails.size)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2">Format:</td>
                          <td className="text-right font-medium">
                            {fileDetails.filename.split('.').pop()?.toUpperCase() || '-'}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
                            </div>
              
              {/* Right column - Metadata */}
              <div>
                <h3 className="font-medium mb-2">Metadata</h3>
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="py-2">Created by:</td>
                      <td className="text-right font-medium">
                        {fileDetails.metadata?.author || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">Date Added:</td>
                      <td className="text-right font-medium">
                        {fileDetails.metadata?.creation_date 
                          ? new Date(fileDetails.metadata.creation_date).toLocaleString()
                          : '-'
                        }
                      </td>
                    </tr>
                    {isFolder && fileDetails.metadata?.item_count !== undefined ? (
                      <tr>
                        <td className="py-2">Contains:</td>
                        <td className="text-right font-medium">
                          {fileDetails.metadata.item_count} {fileDetails.metadata.item_count === 1 ? 'item' : 'items'}
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td className="py-2">Location:</td>
                        <td className="text-right font-medium">
                          {currentPath.length > 0 ? '/' + currentPath.join('/') : '/'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                  </div>
                      </div>

            {/* Footer with close button */}
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowFileDetails(false)}>Close</Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add back the ContextMenu component that was accidentally removed
  const ContextMenu = () => {
    if (!contextMenu.item) return null;
    
    return (
      <div 
        className="absolute z-50 bg-white rounded-md shadow-lg border border-gray-200 py-1 w-40"
        style={{
          left: `${contextMenu.x}px`,
          top: `${contextMenu.y}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
          onClick={() => handleOpenRenameDialog(contextMenu.item!)}
        >
          <Edit className="w-4 h-4 mr-2" />
          Rename
        </button>
        <button 
          className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
          onClick={() => {
            closeContextMenu();
            handleViewFileDetails(contextMenu.item!);
          }}
        >
          <Info className="w-4 h-4 mr-2" />
          View Details
        </button>
        <button 
          className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100 text-red-600"
          onClick={() => {
            closeContextMenu();
            const fullPath = currentPath.length > 0 
              ? `${currentPath.join('/')}/${contextMenu.item!.name}`
              : contextMenu.item!.name;
            handleDelete(fullPath);
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </button>
      </div>
    );
  };

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
                className={`${
                  selectedItems.includes([...currentPath, item.name].join('/')) ? "bg-muted" : ""
                } ${
                  item.type === "folder" ? "cursor-pointer hover:bg-muted/50" : ""
                }`}
                onClick={(e) => {
                  // If it's a folder and the click wasn't on the checkbox, navigate into it
                  if (item.type === "folder" && !(e.target as HTMLElement).closest('input[type="checkbox"]')) {
                    setCurrentPath([...currentPath, item.name])
                  } else {
                    handleSelectItem(item.name)
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, item)}
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
                  {item.modified instanceof Date
                    ? item.modified.toLocaleDateString()
                    : new Date(item.modified).toLocaleDateString()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                      onClick={() => handleViewFileDetails(item)}
                        title="View Details"
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation() // Prevent row click event
                        // Construct full path by joining current path with filename
                        const fullPath = currentPath.length > 0 
                          ? `${currentPath.join('/')}/${item.name}`
                          : item.name
                        console.log('Delete button clicked for item:', fullPath)
                        handleDelete(fullPath)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleContextMenu(e, item)}
                      title="More Options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {fileDetails && <FileDetailsDialog />}
      {contextMenu.item && <ContextMenu />}
      <RenameDialog />
    </div>
  )
}

export default DocumentsPage