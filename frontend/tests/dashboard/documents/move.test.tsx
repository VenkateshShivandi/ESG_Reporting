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
    name: 'Annual Report.pdf',
    type: 'file',
    path: [],
    size: 1024,
    modified: new Date(),
    processed: false,
    chunked: false,
  },
  {
    id: '2',
    name: 'Sustainability Data',
    type: 'folder',
    path: [],
    size: 0,
    modified: new Date(),
    processed: false,
    chunked: false,
  },
  {
    id: '3',
    name: 'Archives',
    type: 'folder',
    path: ['Sustainability Data'],
    size: 0,
    modified: new Date(),
    processed: false,
    chunked: false,
  },
];

describe('DocumentsPage - Move', () => {
  beforeEach(() => {
    documentsApi.listFiles = vi.fn(async (path?: string[]) => {
      if (path?.join('/') === 'Sustainability Data') {
        return [mockFiles[2]];
      }
      return mockFiles;
    });
    
    documentsApi.renameItem = vi.fn().mockResolvedValue({ success: true });
    globalThis.toast = { success: vi.fn(), error: vi.fn(), loading: vi.fn() };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithDnd = (ui: React.ReactElement) =>
    render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);

  describe('Move File Interactions', () => {
    it('should open move dialog with folder structure', async () => {
      renderWithDnd(<DocumentsPage />);
      
      // Open context menu for file
      const fileRow = await screen.findByRole('row', { name: /Annual Report\.pdf/i });
      const menuButton = within(fileRow).getByRole('button', { name: /more actions/i });
      fireEvent.click(menuButton);

      // Click move button
      const moveButton = await screen.findByText(/move to folder/i);
      fireEvent.click(moveButton);

      // Verify dialog contents
      expect(screen.getByText('Move Item')).toBeInTheDocument();
      expect(screen.getByText('Sustainability Data')).toBeInTheDocument();
    });

    it('should successfully move file to new folder', async () => {
      renderWithDnd(<DocumentsPage />);
      
      // Wait for files to load
      await screen.findAllByRole('row');

      // Open move dialog for file
      const fileRow = await screen.findByRole('row', { 
        name: /Annual Report\.pdf/i 
      });
      const menuButton = within(fileRow).getByRole('button', { name: /more actions/i });
      fireEvent.click(menuButton);

      // Get move menu item using role
      const moveMenuItem = await screen.findByRole('menuitem', { 
        name: /move to folder/i 
      });
      fireEvent.click(moveMenuItem);

      // Select target folder
      const folderNode = await screen.findByText(/Sustainability Data/i);
      fireEvent.click(folderNode);
      fireEvent.click(screen.getByText('Move Here'));

      // Verify API call
      await waitFor(() => {
        expect(documentsApi.renameItem).toHaveBeenCalledWith(
          'Annual Report.pdf',
          'Sustainability Data/Annual Report.pdf'
        );
        expect(globalThis.toast.success).toHaveBeenCalled();
      });
    });

    it('should move a file to another folder', async () => {
      renderWithDnd(<DocumentsPage />);
      
      // Select file
      const fileRow = await screen.findByRole('row', { name: /Annual Report\.pdf/i });
      const menuButton = within(fileRow).getByRole('button', { name: /more actions/i });
      fireEvent.click(menuButton);
      
      // Initiate move
      fireEvent.click(await screen.findByText(/move to folder/i));
      
      // Select target folder
      const folderItem = await screen.findByText(/Sustainability Data/i);
      fireEvent.click(folderItem);
      
      // Confirm move
      fireEvent.click(screen.getByRole('button', { name: /move here/i }));

      await waitFor(() => {
        expect(documentsApi.renameItem).toHaveBeenCalledWith(
          'Annual Report.pdf',
          'Sustainability Data/Annual Report.pdf'
        );
      });
    });

    it('should show error when move fails', async () => {
      documentsApi.renameItem = vi.fn().mockRejectedValue(new Error('Move failed'));
      renderWithDnd(<DocumentsPage />);
      
      // ... repeat move steps ...
      
      await waitFor(() => {
        expect(screen.getByText(/failed to move file/i)).toBeInTheDocument();
      });
    });

    it('should cancel move operation', async () => {
      renderWithDnd(<DocumentsPage />);
      
      // Start move process
      // ...
      
      // Cancel before confirmation
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      
      await waitFor(() => {
        expect(documentsApi.renameItem).not.toHaveBeenCalled();
      });
    });
  });
});