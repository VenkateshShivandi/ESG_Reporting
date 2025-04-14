'use client';

import React, { forwardRef, ReactNode, RefObject, useState } from 'react';
import { DragItem, useDraggable, useFileDroppable } from '@/lib/hooks/useDragDrop';
import { FileItem } from '@/lib/types/documents';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface DraggableFileItemProps {
  file: FileItem;
  children: ReactNode;
  onFileToFileDrop: (droppedFile: DragItem, targetFile: FileItem) => void;
}

const DraggableFileItem = forwardRef<HTMLDivElement, DraggableFileItemProps>(
  ({ file, children, onFileToFileDrop }, ref) => {
    const { drag, isDragging } = useDraggable(file);
    const { drop, isOver, canDrop } = useFileDroppable(file, onFileToFileDrop);
    const [showDragHandle, setShowDragHandle] = useState(false);

    // Combine drag ref with drop ref for file items (they're both draggable and droppable)
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
          isOver && canDrop && 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600',
          isOver && !canDrop && 'bg-red-100 dark:bg-red-900/30'
        )}
        data-file-id={file.id}
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

DraggableFileItem.displayName = 'DraggableFileItem';

export default DraggableFileItem; 