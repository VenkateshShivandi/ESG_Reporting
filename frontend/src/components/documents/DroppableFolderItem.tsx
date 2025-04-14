'use client';

import React, { forwardRef, ReactNode, RefObject, useState } from 'react';
import { DragItem, useDraggable, useDroppable } from '@/lib/hooks/useDragDrop';
import { FileItem } from '@/lib/types/documents';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface DroppableFolderItemProps {
  folder: FileItem;
  children: ReactNode;
  onFileDrop: (droppedFile: DragItem, targetPath: string[]) => void;
}

const DroppableFolderItem = forwardRef<HTMLDivElement, DroppableFolderItemProps>(
  ({ folder, children, onFileDrop }, ref) => {
    const { drag, isDragging } = useDraggable(folder);
    const { drop, isOver, canDrop } = useDroppable(
      [...folder.path, folder.name], 
      onFileDrop
    );
    const [showDragHandle, setShowDragHandle] = useState(false);

    // Combine drag ref with drop ref for folders (they're both draggable and droppable)
    const dragDropRef = (node: HTMLDivElement) => {
      drag(node);
      drop(node);
      // Forward ref if provided
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as RefObject<HTMLDivElement>).current = node;
      }
    };

    return (
      <div
        ref={dragDropRef}
        className={cn(
          'transition-all duration-200 flex items-center group relative cursor-grab active:cursor-grabbing',
          isDragging && 'opacity-50 shadow-lg scale-105',
          isOver && canDrop && 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-600',
          !isOver && canDrop && 'hover:bg-yellow-50 dark:hover:bg-yellow-900/10'
        )}
        data-folder-id={folder.id}
        onMouseEnter={() => setShowDragHandle(true)}
        onMouseLeave={() => setShowDragHandle(false)}
      >
        <div className={cn(
          'absolute left-0 top-0 bottom-0 flex items-center justify-center w-3 transition-opacity',
          showDragHandle || isDragging ? 'opacity-100' : 'opacity-0'
        )}>
          <GripVertical className="h-3 w-3 text-gray-400" />
        </div>
        <div className="pl-0 w-full">
          {children}
        </div>
      </div>
    );
  }
);

DroppableFolderItem.displayName = 'DroppableFolderItem';

export default DroppableFolderItem; 