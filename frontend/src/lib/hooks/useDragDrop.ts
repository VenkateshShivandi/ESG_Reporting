'use client';

import { useDrag, useDrop } from 'react-dnd';
import { FileItem } from '@/lib/types/documents';

// Define DnD types
export const ItemTypes = {
  FILE: 'file',
  FOLDER: 'folder'
};

// Generic drag item interface
export interface DragItem {
  type: string;
  id: string;
  path: string[];
  name: string;
  itemType: 'file' | 'folder';
}

// Hook for making an item draggable
export function useDraggable(item: FileItem) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: item.type === 'folder' ? ItemTypes.FOLDER : ItemTypes.FILE,
    item: {
      id: item.id,
      path: item.path,
      name: item.name,
      itemType: item.type
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }));

  return { drag, isDragging };
}

// Hook for making a folder a drop target
export function useDroppable(
  folderPath: string[], 
  onFileDrop: (droppedFile: DragItem, targetPath: string[]) => void,
  onFileToFileDrop?: (droppedFile: DragItem, targetFile: DragItem) => void
) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: [ItemTypes.FILE, ItemTypes.FOLDER],
    drop: (draggedItem: DragItem, monitor) => {
      // If it's a file being dropped on a folder
      if (monitor.getItemType() === ItemTypes.FILE) {
        onFileDrop(draggedItem, folderPath);
      }
      return { droppedIn: true };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    })
  }));

  return { drop, isOver, canDrop };
}

// Hook for making a file a drop target (for file-to-file drops to create folders)
export function useFileDroppable(
  file: FileItem,
  onFileToFileDrop: (droppedFile: DragItem, targetFile: FileItem) => void
) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: [ItemTypes.FILE],
    drop: (draggedItem: DragItem, monitor) => {
      if (monitor.getItemType() === ItemTypes.FILE && draggedItem.id !== file.id) {
        onFileToFileDrop(draggedItem, file);
      }
      return { droppedIn: true };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop() && 
               monitor.getItem().id !== file.id // Prevent dropping on itself
    })
  }));

  return { drop, isOver, canDrop };
} 