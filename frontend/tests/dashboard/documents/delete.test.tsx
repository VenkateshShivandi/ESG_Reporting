// Using Cursor rules 😊
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // Import userEvent
import '@testing-library/jest-dom';
import DocumentsPage from '@/pages/DocumentsPage';
import { documentsApi } from '@/lib/api/documents';
import type { FileItem } from '@/lib/types/documents';
import { vi, type Mock } from 'vitest'; // Import vi and Mock type
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'sonner'; // Import toast

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/client', () => {
  return {
    supabase: {
      auth: {
        onAuthStateChange: vi.fn(),
        signInWithPassword: vi.fn().mockResolvedValue({ user: { id: '123' } }),
        signOut: vi.fn(),
        getSession: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        single: vi.fn(),
      })),
    },
    __esModule: true,
    default: {
      auth: {
        onAuthStateChange: vi.fn(),
        signInWithPassword: vi.fn().mockResolvedValue({ user: { id: '123' } }),
        signOut: vi.fn(),
        getSession: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        single: vi.fn(),
      })),
    }
  };
});

vi.mock('@/lib/api/documents');

const mockInitialFiles: FileItem[] = [
  {
    id: '1',
    name: 'TestFile.pdf', // Renamed to avoid conflict if other tests use Test.pdf
    type: 'file',
    path: [],
    size: 1024,
    modified: new Date(),
    processed: true,
    chunked: true,
  },
  {
    id: '2',
    name: 'AnotherFolder', // Renamed to avoid conflict
    type: 'folder',
    path: [],
    size: 0,
    modified: new Date(),
    processed: false,
    chunked: false,
  },
  {
    id: '3',
    name: 'ThirdItem.txt',
    type: 'file',
    path: [],
    size: 50,
    modified: new Date(),
    processed: false,
    chunked: false,
  },
  {
    id: 'folder-1',
    name: 'MySubfolder',
    type: 'folder',
    path: [],
    size: 0,
    modified: new Date(),
    processed: false,
    chunked: false,
  },
  {
    id: 'file-in-subfolder',
    name: 'DocInSub.txt',
    type: 'file',
    path: ['MySubfolder'],
    size: 120,
    modified: new Date(),
    processed: false,
    chunked: false,
  }
];

const renderWithDnd = (ui: React.ReactElement) =>
  render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);

describe("Delete Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for listFiles
    (documentsApi.listFiles as Mock).mockImplementation(async (path: string[] = []) => {
      const pathStr = path.join('/');
      if (path.length === 0) {
        return mockInitialFiles.filter(f => f.path.length === 0 && f.name !== '.folder');
      }
      return mockInitialFiles.filter(f => f.path.join('/') === pathStr && f.name !== '.folder');
    });

    // Default mock for deleteFile
    (documentsApi.deleteFile as Mock).mockResolvedValue({ success: true });
  });

  // UC-DEL-001: Delete a single selected file.
  it("should delete a single selected file successfully", async () => {
    renderWithDnd(<DocumentsPage />);

    const fileNameToDelete = 'TestFile.pdf';

    // 1. Wait for initial files to load
    const fileElement = await screen.findByText(fileNameToDelete);
    expect(fileElement).toBeInTheDocument();
    expect(screen.getByText('AnotherFolder')).toBeInTheDocument();

    // 2. Select the file
    const row = fileElement.closest('tr');
    if (!row) throw new Error(`Row for ${fileNameToDelete} not found`);
    const checkbox = within(row).getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // 3. Verify Delete button is enabled
    const deleteButton = screen.getByRole('button', { name: /Delete$/i }); // Main delete button
    expect(deleteButton).not.toBeDisabled();

    // 4. Click the Delete button
    fireEvent.click(deleteButton);

    // 5. Assertions
    // Toast loading
    expect(toast.loading).toHaveBeenCalledWith("Deleting 1 item...");

    // API call
    await waitFor(() => {
      expect(documentsApi.deleteFile).toHaveBeenCalledWith(fileNameToDelete); // Path is just the name if in root
    });
    
    // Mock listFiles for the refresh call to return files without the deleted one
    (documentsApi.listFiles as Mock).mockImplementation(async (path: string[] = []) => {
      if (path.length === 0) {
        return mockInitialFiles.filter(f => f.name !== fileNameToDelete && f.path.length === 0 && f.name !== '.folder');
      }
      return [];
    });
    
    // Wait for UI to update - file should be gone
    // The loadFiles is called within a setTimeout(300) in the component
    await waitFor(async () => {
      expect(screen.queryByText(fileNameToDelete)).not.toBeInTheDocument();
    }, { timeout: 1000 }); // Increased timeout to accommodate setTimeout

    // Other file should still be there
    await waitFor(() => {
      expect(screen.getByText('AnotherFolder')).toBeInTheDocument();
    });
    
    // Delete button should be disabled again
    expect(deleteButton).toBeDisabled();

    // Toast success
    // The success toast is also within the setTimeout
    await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("1 item deleted successfully", expect.any(Object));
    }, { timeout: 1000 });

    // Selected items should be cleared (implicitly checked by delete button being disabled)
    // We can also check if the checkbox for the remaining item is unchecked if needed
    const anotherFolderRow = screen.getByText('AnotherFolder').closest('tr');
    if (!anotherFolderRow) throw new Error("Row for AnotherFolder not found after delete");
    const anotherFolderCheckbox = within(anotherFolderRow).getByRole('checkbox');
    expect(anotherFolderCheckbox).not.toBeChecked();

  });

  // UC-DEL-002: Attempt to delete a file when none is selected.
  it("should keep the delete button disabled if no file is selected", async () => {
    renderWithDnd(<DocumentsPage />);

    // 1. Wait for initial files to load
    await screen.findByText('TestFile.pdf');
    await screen.findByText('AnotherFolder');

    // 2. Verify Delete button is present and disabled
    const deleteButton = screen.getByRole('button', { name: /Delete$/i });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toBeDisabled();

    // 3. (Optional) Try clicking it and ensure no actions happen
    fireEvent.click(deleteButton); // Clicking a disabled button should do nothing

    expect(documentsApi.deleteFile).not.toHaveBeenCalled();
    expect(toast.loading).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  // UC-DEL-003: Delete multiple selected items (files and/or folders).
  it("should delete multiple selected items successfully", async () => {
    renderWithDnd(<DocumentsPage />);

    const itemsToDelete = ['TestFile.pdf', 'AnotherFolder'];
    const remainingItem = 'ThirdItem.txt';

    // 1. Wait for initial files to load
    await screen.findByText(itemsToDelete[0]);
    await screen.findByText(itemsToDelete[1]);
    await screen.findByText(remainingItem);

    // 2. Select multiple items
    for (const itemName of itemsToDelete) {
      const itemElement = screen.getByText(itemName);
      const row = itemElement.closest('tr');
      if (!row) throw new Error(`Row for ${itemName} not found`);
      const checkbox = within(row).getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    }

    // 3. Verify Delete button is enabled
    const deleteButton = screen.getByRole('button', { name: /Delete$/i });
    expect(deleteButton).not.toBeDisabled();

    // 4. Click the Delete button
    fireEvent.click(deleteButton);

    // 5. Assertions
    // Toast loading
    expect(toast.loading).toHaveBeenCalledWith(`Deleting ${itemsToDelete.length} items...`);

    // API calls
    await waitFor(() => {
      for (const itemName of itemsToDelete) {
        expect(documentsApi.deleteFile).toHaveBeenCalledWith(itemName);
      }
    });
    expect(documentsApi.deleteFile).toHaveBeenCalledTimes(itemsToDelete.length);

    // Mock listFiles for the refresh call
    (documentsApi.listFiles as Mock).mockImplementation(async (path: string[] = []) => {
      if (path.length === 0) {
        return mockInitialFiles.filter(f => !itemsToDelete.includes(f.name) && f.path.length === 0 && f.name !== '.folder');
      }
      return [];
    });

    // Wait for UI to update - deleted items should be gone
    await waitFor(() => {
      for (const itemName of itemsToDelete) {
        expect(screen.queryByText(itemName)).not.toBeInTheDocument();
      }
    }, { timeout: 1000 });

    // Remaining item should still be there
    await waitFor(() => {
      expect(screen.getByText(remainingItem)).toBeInTheDocument();
    });
    
    // Delete button should be disabled again
    expect(deleteButton).toBeDisabled();

    // Toast success
    await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(`${itemsToDelete.length} items deleted successfully`, expect.any(Object));
    }, { timeout: 1000 });

    // Checkbox for remaining item should be unchecked
    const remainingItemRow = screen.getByText(remainingItem).closest('tr');
    if (!remainingItemRow) throw new Error(`Row for ${remainingItem} not found`);
    const remainingItemCheckbox = within(remainingItemRow).getByRole('checkbox');
    expect(remainingItemCheckbox).not.toBeChecked();
  });

  // UC-DEL-004: API call to deleteFile fails.
  it("should show an error toast if deleting a file fails", async () => {
    // Mock deleteFile to reject
    (documentsApi.deleteFile as Mock).mockRejectedValue(new Error("Simulated API error"));

    renderWithDnd(<DocumentsPage />);

    const fileNameToDelete = 'TestFile.pdf';

    // 1. Wait for initial files to load
    const fileElement = await screen.findByText(fileNameToDelete);
    expect(fileElement).toBeInTheDocument();

    // 2. Select the file
    const row = fileElement.closest('tr');
    if (!row) throw new Error(`Row for ${fileNameToDelete} not found`);
    const checkbox = within(row).getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // 3. Click the Delete button
    const deleteButton = screen.getByRole('button', { name: /Delete$/i });
    fireEvent.click(deleteButton);

    // 4. Assertions
    // Toast loading (still appears initially)
    expect(toast.loading).toHaveBeenCalledWith("Deleting 1 item...");

    // API call
    await waitFor(() => {
      expect(documentsApi.deleteFile).toHaveBeenCalledWith(fileNameToDelete);
    });

    // Error toast
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete item(s)");
    });

    // File should still be in the document because deletion failed
    expect(screen.getByText(fileNameToDelete)).toBeInTheDocument();

    // Item should remain selected, and delete button enabled
    expect(checkbox).toBeChecked();
    expect(deleteButton).not.toBeDisabled();

    // listFiles should NOT have been called again after the error to refresh the list unnecessarily
    // It was called once on initial load, and that should be it.
    expect(documentsApi.listFiles).toHaveBeenCalledTimes(1);
  });

  // UC-DEL-005: Delete an item from a subfolder.
  it("should correctly delete an item from a subfolder", async () => {
    renderWithDnd(<DocumentsPage />);

    const subfolderName = 'MySubfolder';
    const fileNameInSubfolder = 'DocInSub.txt';

    // 1. Navigate into the subfolder
    await screen.findByText(subfolderName); // Ensure subfolder is loaded in root
    fireEvent.click(screen.getByText(subfolderName));

    // Wait for the file in the subfolder to load
    const fileElement = await screen.findByText(fileNameInSubfolder);
    expect(fileElement).toBeInTheDocument();

    // 2. Select the file
    const row = fileElement.closest('tr');
    if (!row) throw new Error(`Row for ${fileNameInSubfolder} not found`);
    const checkbox = within(row).getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // 3. Verify Delete button is enabled
    const deleteButton = screen.getByRole('button', { name: /Delete$/i });
    expect(deleteButton).not.toBeDisabled();

    // 4. Click the Delete button
    fireEvent.click(deleteButton);

    // 5. Assertions
    // Toast loading
    expect(toast.loading).toHaveBeenCalledWith("Deleting 1 item...");

    // API call
    const expectedPathToDelete = `${subfolderName}/${fileNameInSubfolder}`;
    await waitFor(() => {
      expect(documentsApi.deleteFile).toHaveBeenCalledWith(expectedPathToDelete);
    });

    // Mock listFiles for the refresh call within the subfolder
    (documentsApi.listFiles as Mock).mockImplementation(async (path: string[] = []) => {
      const pathStr = path.join('/');
      if (pathStr === subfolderName) { // When listing files in subfolder
        return []; // Return empty as the file is deleted
      }
      if (path.length === 0) { // For root, still show other files
        return mockInitialFiles.filter(f => f.path.length === 0 && f.name !== '.folder' && f.name !== fileNameInSubfolder);
      }
      return mockInitialFiles.filter(f => f.path.join('/') === pathStr && f.name !== '.folder');
    });

    // Wait for UI to update - file should be gone
    await waitFor(() => {
      expect(screen.queryByText(fileNameInSubfolder)).not.toBeInTheDocument();
    }, { timeout: 1000 });

    // Check for "No files in this folder" message
    expect(await screen.findByText("No files in this folder")).toBeInTheDocument();

    // Delete button should be disabled again
    expect(deleteButton).toBeDisabled();

    // Toast success
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("1 item deleted successfully", expect.any(Object));
    }, { timeout: 1000 });
  });

  // UC-DEL-006: Delete button in the item's dropdown menu.
  it("should delete a single item using its dropdown menu delete button", async () => {
    renderWithDnd(<DocumentsPage />);

    const fileNameToDelete = 'TestFile.pdf';

    // 1. Wait for initial files to load
    const fileElement = await screen.findByText(fileNameToDelete);
    expect(fileElement).toBeInTheDocument();

    // 2. Find the row and the "More actions" button for the file
    const row = fileElement.closest('tr');
    if (!row) throw new Error(`Row for ${fileNameToDelete} not found`);

    // Try findByRole directly which includes waitFor
    const moreActionsButton = within(row).getByTitle('More actions');
    expect(moreActionsButton).toBeInTheDocument();
    // 3. Click the "More actions" button to open the dropdown
    await userEvent.click(moreActionsButton); // Use userEvent.click

    // Check if the dropdown is marked as open
    expect(moreActionsButton).toHaveAttribute('aria-expanded', 'true');
    screen.debug(document.body); // Debug the entire body to see if the portal-rendered menu appears

    // 4. Click the "Delete" option in the dropdown menu
    // The dropdown is rendered in a portal, so we search globally by role 'menuitem' and name.
    const deleteMenuItem = await screen.findByRole('menuitem', { name: /Delete$/i }, { timeout: 4000 });
    fireEvent.click(deleteMenuItem);

    // 5. Assertions
    // Toast loading - specific to dropdown delete
    expect(toast.loading).toHaveBeenCalledWith(`Deleting ${fileNameToDelete}...`);

    // API call
    await waitFor(() => {
      expect(documentsApi.deleteFile).toHaveBeenCalledWith(fileNameToDelete);
    });

    // Mock listFiles for the refresh call
    (documentsApi.listFiles as Mock).mockImplementation(async (path: string[] = []) => {
      console.log('listFiles mock in UC-DEL-006 (after delete) called with path:', path); 
      if (path.length === 0) {
        const filteredRootFiles = mockInitialFiles.filter(f => 
          f.name !== fileNameToDelete && 
          f.path.length === 0 && 
          f.name !== '.folder'
        );
        console.log('Mock returning for root path (UC-DEL-006 after delete):', JSON.stringify(filteredRootFiles.map(f=>f.name))); // Log names
        return filteredRootFiles;
      }
      return []; // Should not be listing subfolders in this test after root delete
    });

    // Wait for UI to update - file should be gone
    await waitFor(() => {
      expect(screen.queryByText(fileNameToDelete)).not.toBeInTheDocument();
    }, { timeout: 1000 });


    // Main Delete button should be disabled as no checkboxes are selected
    const mainDeleteButton = screen.getByRole('button', { name: /Delete$/i });
    expect(mainDeleteButton).toBeDisabled();

    // Other file should still be there - query by row name for robustness
    await waitFor(() => {
      const anotherFolderRow = screen.getByRole('row', { name: /AnotherFolder/i });
      expect(anotherFolderRow).toBeInTheDocument();
    }, { timeout: 1000 });

    // Toast success - specific to dropdown delete
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(`${fileNameToDelete} deleted successfully`, expect.any(Object));
    }, { timeout: 1000 });

    // Ensure no items are selected (checkboxes)
    const checkboxes = screen.queryAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
        // The first checkbox is the 'select all' checkbox, others are for items
        if (checkbox.getAttribute('aria-label') !== 'Select all documents') {
            expect(checkbox).not.toBeChecked();
        }
    });

  });
}); 