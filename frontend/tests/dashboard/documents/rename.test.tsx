// Using Cursor rules 😊
// Comprehensive test suite for file and folder rename functionality
// Tests cover all major scenarios: success, validation, error handling, and user interactions

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import DocumentsPage from '@/pages/DocumentsPage';
import { documentsApi } from '@/lib/api/documents';
import { FileItem, RenameItemResponse } from '@/lib/types/documents';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  default: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
  },
}));

// Mock the API
vi.mock('@/lib/api/documents');

// Mock sonner toast (the actual toast library used in the app)
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
  },
}));

// Import the mocked toast
import { toast } from 'sonner';

// helper to wrap with DnD context
const renderWithDnd = (ui: React.ReactElement) =>
  render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);

// common test data
const baseFiles: FileItem[] = [
  { id: '1', name: 'test-file.pdf', type: 'file', path: [], modified: new Date(), chunked: false },
  { id: '2', name: 'test-folder', type: 'folder', path: [], modified: new Date(), chunked: false },
  { id: '3', name: 'existing-name.pdf', type: 'file', path: [], modified: new Date(), chunked: false },
];

// helper to open the rename dialog for a given row
const openRenameDialog = async (itemName: string) => {
  const row = screen.getByText(itemName).closest('tr') as HTMLElement;
  const moreBtn = within(row).getByRole('button', { name: /more-actions/i });
  
  // Wait for the button to be enabled and visible
  await waitFor(() => {
    expect(moreBtn).toBeEnabled();
    expect(moreBtn).toBeVisible();
  });
  
  await userEvent.click(moreBtn);
  
  // Wait for the dropdown menu to appear and be interactive
  const renameBtn = await screen.findByRole('menuitem', { name: /rename/i });
  await waitFor(() => {
    expect(renameBtn).toBeVisible();
    expect(renameBtn).toBeEnabled();
  });
  
  await userEvent.click(renameBtn);
};

describe('Rename File/Folder Functionality', () => {
  let files: FileItem[]; // fresh copy per test

  beforeEach(() => {
    vi.clearAllMocks();
    files = baseFiles.map(f => ({ ...f }));

    // listFiles returns current snapshot
    vi.mocked(documentsApi.listFiles).mockImplementation(async () => files);

    // default renameItem implementation: update in-memory array then return success
    vi.mocked(documentsApi.renameItem).mockImplementation(
      async (oldPath: string, newName: string): Promise<RenameItemResponse> => {
        const idx = files.findIndex(f => f.name === oldPath.split('/').pop());
        if (idx > -1) files[idx].name = newName;
        return { success: true, oldPath, newPath: newName };
      },
    );
  });

  it('UC-REN-001: renames a file successfully', async () => {
    const newName = 'renamed-file.pdf';
    renderWithDnd(<DocumentsPage />);

    await waitFor(() => screen.getByText('test-file.pdf'));
    await openRenameDialog('test-file.pdf');

    const input = screen.getByDisplayValue('test-file.pdf');
    await userEvent.clear(input);
    await userEvent.type(input, newName);
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(documentsApi.renameItem).toHaveBeenCalledWith('test-file.pdf', newName);

    await waitFor(() => screen.getByText(newName));
    expect(toast.success).toHaveBeenCalled();
  });

  it('UC-REN-002: renames a folder successfully', async () => {
    const newName = 'renamed-folder';
    renderWithDnd(<DocumentsPage />);

    await waitFor(() => screen.getByText('test-folder'));
    await openRenameDialog('test-folder');

    const input = screen.getByDisplayValue('test-folder');
    await userEvent.clear(input);
    await userEvent.type(input, newName);
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(documentsApi.renameItem).toHaveBeenCalledWith('test-folder', newName);
    await waitFor(() => screen.getByText(newName));
    expect(toast.success).toHaveBeenCalled();
  });

  it('UC-REN-003: cancels rename on empty input', async () => {
    renderWithDnd(<DocumentsPage />);

    await waitFor(() => screen.getByText('test-file.pdf'));
    await openRenameDialog('test-file.pdf');

    const input = screen.getByDisplayValue('test-file.pdf');
    await userEvent.clear(input); // leave empty
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(documentsApi.renameItem).not.toHaveBeenCalled();
  });

  it('UC-REN-004: cancels rename when new name equals old name', async () => {
    renderWithDnd(<DocumentsPage />);

    await waitFor(() => screen.getByText('test-file.pdf'));
    await openRenameDialog('test-file.pdf');

    const input = screen.getByDisplayValue('test-file.pdf');
    await userEvent.clear(input);
    await userEvent.type(input, 'test-file.pdf');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(documentsApi.renameItem).not.toHaveBeenCalled();
  });

  it('UC-REN-005: duplicate name returns error', async () => {
    // make renameItem reject to simulate backend duplicate error
    vi.mocked(documentsApi.renameItem).mockRejectedValue(
      new Error('already exists'),
    );

    renderWithDnd(<DocumentsPage />);
    await waitFor(() => screen.getByText('test-file.pdf'));
    await openRenameDialog('test-file.pdf');

    const input = screen.getByDisplayValue('test-file.pdf');
    await userEvent.clear(input);
    await userEvent.type(input, 'existing-name.pdf');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(documentsApi.renameItem).toHaveBeenCalled();
  });

  it('UC-REN-006: network error shows error toast', async () => {
    vi.mocked(documentsApi.renameItem).mockRejectedValue(
      new Error('Network error'),
    );

    renderWithDnd(<DocumentsPage />);
    await waitFor(() => screen.getByText('test-file.pdf'));
    await openRenameDialog('test-file.pdf');

    const input = screen.getByDisplayValue('test-file.pdf');
    await userEvent.clear(input);
    await userEvent.type(input, 'new-name.pdf');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it('UC-REN-007: cancel rename via Esc key', async () => {
    renderWithDnd(<DocumentsPage />);
    await waitFor(() => screen.getByText('test-file.pdf'));
    await openRenameDialog('test-file.pdf');

    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByDisplayValue('test-file.pdf')).not.toBeInTheDocument(),
    );

    expect(documentsApi.renameItem).not.toHaveBeenCalled();
  });

  it('UC-REN-008: Handle API response with a warning during rename (e.g., partial success).', async () => {
    // Arrange
    const mockResponse: RenameItemResponse = {
      success: true,
      oldPath: 'test-file.pdf',
      newPath: 'renamed-with-warning.pdf',
      warning: 'Some related operations were not completed'
    };
    vi.mocked(documentsApi.renameItem).mockResolvedValue(mockResponse);
    
    // Mock file list updates - initial load and after rename
    const updatedFiles = files.map(file => 
      file.name === 'test-file.pdf' ? { ...file, name: 'renamed-with-warning.pdf' } : file
    );
    vi.mocked(documentsApi.listFiles)
      .mockResolvedValueOnce(files) // Initial load
      .mockResolvedValueOnce(updatedFiles); // After rename
    
    renderWithDnd(<DocumentsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
    });

    // Act
    await openRenameDialog('test-file.pdf');

    const renameInput = screen.getByDisplayValue('test-file.pdf');
    await userEvent.clear(renameInput);
    await userEvent.type(renameInput, 'renamed-with-warning.pdf');

    const submitButton = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(submitButton);

    // Assert - Check warning toast is called (this should happen immediately)
    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(
        expect.stringContaining('Partial success'),
        expect.any(Object)
      );
    });

  });
});
