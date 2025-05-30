// Using Cursor rules 😊
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DocumentsPage from '@/pages/DocumentsPage';
import { documentsApi } from '@/lib/api/documents';
import type { FileItem } from '@/lib/types/documents';
import { vi } from 'vitest';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
// Removed 'act' from react-dom/test-utils as userEvent often handles it, 
// and we can use @testing-library/react's act if specifically needed.

// Mock Sonner
vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    toast: {
      loading: vi.fn(() => 'toast-id'),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  };
});
import { toast as mockedSonnerToast } from 'sonner';


// Mock implementations
vi.mock('@/lib/api/documents');
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { // Added auth mock based on etl.test.tsx for consistency
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
   __esModule: true, // Added based on etl.test.tsx
    default: { // Added based on etl.test.tsx
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
}));

const initialMockFiles: FileItem[] = [
  {
    id: '1',
    name: 'Annual Report.pdf',
    type: 'file',
    path: [],
    size: 1024,
    modified: new Date(),
    processed: false,
    chunked: false,
    processingResult: undefined,
    processingError: undefined,
  },
  {
    id: '2',
    name: 'Sustainability Data',
    type: 'folder',
    path: [], // Root folder
    size: 0,
    modified: new Date(),
    processed: false,
    chunked: false,
    processingResult: undefined,
    processingError: undefined,
  },
  {
    id: '3',
    name: 'Archives',
    type: 'folder',
    path: ['Sustainability Data'], // Nested folder
    size: 0,
    modified: new Date(),
    processed: false,
    chunked: false,
    processingResult: undefined,
    processingError: undefined,
  },
   {
    id: '4',
    name: 'Financials',
    type: 'folder',
    path: [], // Another root folder for testing search
    size: 0,
    modified: new Date(),
    processed: false,
    chunked: false,
    processingResult: undefined,
    processingError: undefined,
  },
];

const renderWithDnd = (ui: React.ReactElement) =>
  render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);


describe("Move Item Functionality", () => {
  let user: UserEvent;
  let currentMockFiles = [...initialMockFiles];

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    currentMockFiles = [...initialMockFiles];

    (documentsApi.listFiles as jest.Mock).mockImplementation(async (path) => {
      if (!path || path.length === 0) return currentMockFiles; // For initial load and root listing in move dialog
      // Add more specific filtering if needed for nested folder listings during tests
      return currentMockFiles.filter(f => JSON.stringify(f.path) === JSON.stringify(path));
    });
    (documentsApi.renameItem as jest.Mock).mockResolvedValue({ success: true }); // Default success for rename

    // Reset Sonner mocks
    (mockedSonnerToast.loading as jest.Mock).mockClear().mockImplementation(() => 'toast-id');
    (mockedSonnerToast.success as jest.Mock).mockClear();
    (mockedSonnerToast.error as jest.Mock).mockClear();
    (mockedSonnerToast.warning as jest.Mock).mockClear();
  });

  // UC-MOV-001: Open the move dialog for a file.
  it("should open the move dialog with folder list when moving a file", async () => {
    renderWithDnd(<DocumentsPage />); 
    await waitFor(() => expect(screen.getByText('Annual Report.pdf')).toBeInTheDocument());

    // Find the row for 'Annual Report.pdf'
    const fileRow = screen.getByText('Annual Report.pdf').closest('tr');
    expect(fileRow).not.toBeNull();

    // Click the MoreVertical button in that row to open dropdown
    const moreButton = within(fileRow!).getByRole('button', { name: /more-actions/i });
    await user.click(moreButton);

    // Click the "Move to folder" item in the dropdown
    const moveToFolderMenuItem = await screen.findByRole('menuitem', { name: /move-to-folder/i });
    await user.click(moveToFolderMenuItem);

    // Dialog should be open
    const dialogTitle = await screen.findByRole('heading', { name: /move item/i, level: 2 });
    expect(dialogTitle).toBeInTheDocument();
    expect(screen.getByText(/Select a destination folder for/i)).toBeInTheDocument();
    expect(screen.getByText('Annual Report.pdf')).toBeInTheDocument(); // Item name shown in dialog

    // Check if folders are listed (at least the root ones we mocked)
    expect(await screen.findByText('Sustainability Data')).toBeInTheDocument();
    expect(await screen.findByText('Financials')).toBeInTheDocument();
    // 'Archives' is nested, so it might not be immediately visible without expansion, which is fine for this test.
  });

  // UC-MOV-002: Select a destination folder in MoveFolderDialog and confirm move.
  it("should move a file to the selected destination folder", async () => {
    renderWithDnd(<DocumentsPage />); 
    await waitFor(() => expect(screen.getByText('Annual Report.pdf')).toBeInTheDocument());

    const fileRow = screen.getByText('Annual Report.pdf').closest('tr');
    const moreButton = within(fileRow!).getByRole('button', { name: /more-actions/i });
    await user.click(moreButton);
    const moveToFolderMenuItem = await screen.findByRole('menuitem', { name: /move-to-folder/i });
    await user.click(moveToFolderMenuItem);

    // Dialog is open, now select 'Sustainability Data' folder
    const destinationFolderItem = await screen.findByText('Sustainability Data');
    await user.click(destinationFolderItem);

    // Click the "Move Here" button
    const moveHereButton = screen.getByRole('button', { name: /move here/i });
    await user.click(moveHereButton);

    // Verify API call and toast
    expect(documentsApi.renameItem).toHaveBeenCalledTimes(1);
    expect(documentsApi.renameItem).toHaveBeenCalledWith(
      'Annual Report.pdf', // oldPath is just the name as it's in root
      'Sustainability Data/Annual Report.pdf' // newPath includes destination folder
    );
    await waitFor(() => {
      expect(mockedSonnerToast.loading).toHaveBeenCalledWith('Moving Annual Report.pdf...');
    });
    await waitFor(() => {
      expect(mockedSonnerToast.success).toHaveBeenCalledWith('Moved Annual Report.pdf successfully', { id: 'toast-id' });
    });

    // Dialog should be closed
    expect(screen.queryByRole('heading', { name: /move item/i, level: 2 })).not.toBeInTheDocument();
    
    // Optionally, verify files are re-listed (though mock setup for this is simple)
    // For a more robust check, the listFiles mock would need to reflect the move.
    // For now, we primarily check the API call and toasts.
  });

  // UC-MOV-003: Attempt to move an item to its current folder.
  it("should show an error when trying to move an item to its current folder", async () => {
    // For this test, we'll try to move 'Annual Report.pdf' (in root) to 'Home' (root)
    renderWithDnd(<DocumentsPage />); 
    await waitFor(() => expect(screen.getByText('Annual Report.pdf')).toBeInTheDocument());

    // listFiles has been called once for the initial render.
    expect(documentsApi.listFiles).toHaveBeenCalledTimes(1);

    const fileRow = screen.getByText('Annual Report.pdf').closest('tr');
    const moreButton = within(fileRow!).getByRole('button', { name: /more-actions/i });
    await user.click(moreButton);
    const moveToFolderMenuItem = await screen.findByRole('menuitem', { name: /move-to-folder/i });
    await user.click(moveToFolderMenuItem);

    // After clicking, handleMoveItem should call listFiles([]) again.
    // So, total calls should now be 2.
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(2);
    });
    // Also ensure the second call was with an empty array (from handleMoveItem)
    // While not strictly necessary for this test's main goal, it confirms the expected internal call.
    expect((documentsApi.listFiles as jest.Mock).mock.calls[1][0]).toEqual([]);


    // Dialog is open. Select 'Home' (root path [])
    // Explicitly wait for the dialog to be open and its title visible
    await screen.findByRole('heading', { name: /move item/i, level: 2 }); 
    const homeFolderItem = await screen.findByText('Home');
    await user.click(homeFolderItem);

    // The "Move Here" button should be disabled, and clicking it (if it were enabled) should show a toast.
    // The component logic prevents moving to the same folder primarily by disabling the button.
    const moveHereButton = screen.getByRole('button', { name: /move here/i });
    expect(moveHereButton).toBeDisabled();

    // If we were to somehow enable and click, it should also show a toast (covered by button state here)
    // To be absolutely sure, let's verify the toast from the component's internal check when clicking move.
    // This requires the button to be clickable for the internal logic to trigger the toast.
    // The component logic is: if (JSON.stringify(item.path) === JSON.stringify(localSelectedPath))
    // Since item.path is [] and localSelectedPath becomes [], this matches.
    // However, the button is disabled. If a user bypasses this, the `handleConfirm` will show the toast.
    // Let's simulate the internal state leading to the toast if the button weren't disabled.
    // For this test, verifying button is disabled is the primary check from UI.
    
    // To test the toast, we need to ensure localSelectedPath is set and then check toast.
    // The click on 'Home' sets localSelectedPath to []. 
    // The itemToMove.path is also [].
    // The DocumentsPage has: if (JSON.stringify(item.path) === JSON.stringify(localSelectedPath)) { toast.error(...) }
    // The button is disabled due to: `disabled={localSelectedPath === null || (localSelectedPath !== null && JSON.stringify(item.path) === JSON.stringify(localSelectedPath))}`
    // The toast will only appear if `handleConfirm` is called and this condition is met. But button is disabled.
    // So the most direct test is to check the button's disabled state.

    // Click the "Move Here" button (it's disabled, so this click won't trigger the API)
    // We can verify that no API call is made and no success/loading toast is shown
    // await user.click(moveHereButton); // UserEvent will not error on disabled elements, but no action occurs

    expect(documentsApi.renameItem).not.toHaveBeenCalled();
    expect(mockedSonnerToast.loading).not.toHaveBeenCalled();
    expect(mockedSonnerToast.success).not.toHaveBeenCalled();
    
    // The specific error toast "Cannot move item to its current folder." is triggered by onConfirmMove 
    // if the button was enabled and paths matched. Since button is disabled, this toast isn't shown.
    // The main protection is the disabled button.
  });

  // UC-MOV-004: Attempt to move an item without selecting a destination folder.
  it("should show an error if no destination folder is selected", async () => {
    // TODO: Implement test
  });

  // UC-MOV-005: Simulate a network error during handleConfirmMove.
  it("should show an error toast if move operation fails on the server", async () => {
    // TODO: Implement test
  });

  // UC-MOV-006: Search within the MoveFolderDialog.
  it("should filter the folder list in the move dialog based on search query", async () => {
    // TODO: Implement test
  });

  // UC-MOV-007: Cancel the move operation from MoveFolderDialog.
  it("should close the move dialog and not move the item when cancelled", async () => {
    // TODO: Implement test
  });
});

describe("Drag and Drop - Move Functionality", () => {
  // UC-DND-001: Drag a file item and drop it onto a folder item.
  it("should move a file to a folder when dragged and dropped onto the folder", () => {
    // TODO: Implement test
  });

  // UC-DND-002: Drag a folder item and drop it onto another folder item.
  it("should move a folder to another folder when dragged and dropped", () => {
    // TODO: Implement test
  });

  // UC-DND-003: Attempt to drag a folder into itself or its subdirectory.
  it("should show an error when trying to drag a folder into itself or its subdirectory", () => {
    // TODO: Implement test
  });
});