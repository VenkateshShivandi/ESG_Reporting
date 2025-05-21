// Using Cursor rules 😊
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentsPage from '@/pages/DocumentsPage';
import { documentsApi } from '@/lib/api/documents';
import type { FileItem } from '@/lib/types/documents';
import { vi } from 'vitest';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Mock implementations
vi.mock('@/lib/api/documents');
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      single: vi.fn(),
    })),
  },
}));

const mockFiles: FileItem[] = [
  {
    id: '1',
    name: 'ESG Report.pdf',
    type: 'file',
    path: [],
    size: 1024,
    modified: new Date(),
    processed: false,
    chunked: false,
  },
  {
    id: '2',
    name: 'Audit Data',
    type: 'folder',
    path: [],
    size: 0,
    modified: new Date(),
    processed: false,
    chunked: false,
  },
];

describe('DocumentsPage - Delete', () => {
  beforeEach(() => {
    documentsApi.listFiles = vi.fn(async () => mockFiles);
    documentsApi.deleteFile = vi.fn().mockResolvedValue({});
    globalThis.toast = { 
      success: vi.fn(),
      error: vi.fn(),
      loading: vi.fn(() => 'toast-id') 
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithDnd = (ui: React.ReactElement) =>
    render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);

  describe('File Deletion', () => {
    it('should delete a single file with confirmation', async () => {
      renderWithDnd(<DocumentsPage />);
      
      // Select file
      const fileRow = await screen.findByRole('row', { name: /ESG Report\.pdf/i });
      const checkbox = within(fileRow).getByRole('checkbox');
      fireEvent.click(checkbox);
      
      // Initiate delete
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
      
      // Confirm deletion
      const confirmButton = await screen.findByRole('button', { name: /confirm delete/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(documentsApi.deleteFile).toHaveBeenCalledWith('1');
        expect(globalThis.toast.success).toHaveBeenCalledWith(
          expect.stringContaining('1 item deleted successfully')
        );
      });
    });

    it('should delete multiple selected files', async () => {
      renderWithDnd(<DocumentsPage />);
      
      // Get the select all checkbox using its aria-label
      const selectAll = await screen.findByRole('checkbox', { 
        name: /select all documents/i 
      });
      
      // Select all files
      fireEvent.click(selectAll);
      
      // Initiate delete
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
      
      // Confirm deletion
      const confirmButton = await screen.findByRole('button', { name: /confirm delete/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(documentsApi.deleteFile).toHaveBeenCalledTimes(2);
        expect(globalThis.toast.success).toHaveBeenCalledWith(
          expect.stringContaining('2 items deleted successfully')
        );
      });
    });

    it('should show error when deletion fails', async () => {
      documentsApi.deleteFile = vi.fn().mockRejectedValue(new Error('Deletion failed'));
      renderWithDnd(<DocumentsPage />);
      
      // Select and delete file
      const fileRow = await screen.findByRole('row', { name: /ESG Report\.pdf/i });
      const checkbox = within(fileRow).getByRole('checkbox');
      fireEvent.click(checkbox);
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      
      // Find confirmation dialog text first
      const dialogText = await screen.findByText(
        /Are you sure you want to delete 1 item\(s\)\?/i,
        {}, 
        { timeout: 5000 }
      );
      
      // Get dialog container
      const dialog = dialogText.closest('[role="dialog"]') as HTMLElement;
      
      // Find confirm button within dialog
      const confirmButton = within(dialog).getByRole('button', { 
        name: /confirm delete/i 
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(globalThis.toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to delete item(s)')
        );
      });
    });

    it('should cancel deletion when user aborts', async () => {
      renderWithDnd(<DocumentsPage />);
      
      // Select file and initiate delete
      const fileRow = await screen.findByRole('row', { name: /ESG Report\.pdf/i });
      const checkbox = within(fileRow).getByRole('checkbox');
      fireEvent.click(checkbox);
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      
      // Wait for dialog content using text match
      const dialog = await screen.findByText(
        /Are you sure you want to delete \d+ item\(s\)\?/i, 
        {}, 
        { timeout: 5000 } // Increased timeout for animation
      );

      // Get the dialog container using closest
      const dialogContainer = dialog.closest('[role="dialog"]') as HTMLElement;

      // Then find the cancel button within the dialog
      const cancelButton = within(dialogContainer).getByRole('button', { 
        name: /cancel/i 
      });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(documentsApi.deleteFile).not.toHaveBeenCalled();
        expect(globalThis.toast.success).not.toHaveBeenCalled();
      });
    });
  });
}); 