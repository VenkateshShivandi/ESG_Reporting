import { create } from "zustand"
import { persist } from "zustand/middleware" // Add persistence
import type { FileItem } from "@/lib/types/documents"

interface FilesState {
  files: FileItem[]
  setFiles: (files: FileItem[]) => void
  addFile: (file: FileItem) => void
  removeFile: (fileId: string) => void
  removeFiles: (fileIds: string[]) => void
  updateFile: (id: string, updatedFile: FileItem) => void
}

// Create a store with persistence
export const useFilesStore = create<FilesState>()(
  persist(
    (set) => ({
      files: [],
      setFiles: (files) => set({ files }),
      addFile: (file) =>
        set((state) => ({
          files: [...state.files, file],
        })),
      removeFile: (fileId) =>
        set((state) => ({
          files: state.files.filter((file) => file.id !== fileId),
        })),
      removeFiles: (fileIds) =>
        set((state) => ({
          files: state.files.filter((file) => !fileIds.includes(file.id)),
        })),
      updateFile: (id, updatedFile) =>
        set((state) => ({
          files: state.files.map(file => 
            file.id === id ? updatedFile : file
          )
        })),
    }),
    {
      name: "files-storage", // unique name for localStorage key
    },
  ),
)

