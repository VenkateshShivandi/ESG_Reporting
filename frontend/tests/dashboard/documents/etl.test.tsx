// Using Cursor rules 😊
import React from 'react';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DocumentsPage from '@/pages/DocumentsPage';
import { documentsApi } from '@/lib/api/documents';
import type { FileItem } from '@/lib/types/documents';
import { vi } from 'vitest';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Mock Sonner correctly due to hoisting
vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal() as any; // Cast to any if original type is complex
  return {
    ...actual,
    toast: {
      loading: vi.fn(() => 'toast-id'),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      // You can add other methods if DocumentsPage uses them and they need mocking
    },
  };
});

// Import the mocked toast object AFTER vi.mock has been defined
import { toast as mockedSonnerToast } from 'sonner';

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

const initialMockFiles: FileItem[] = [
  {
    id: '1',
    name: 'Test.pdf',
    type: 'file',
    path: [],
    size: 1024,
    modified: new Date(),
    processed: false,
    chunked: false,
  },
  {
    id: '2',
    name: 'Report.xlsx',
    type: 'file',
    path: [],
    size: 2048,
    modified: new Date(),
    processed: false,
    chunked: false,
  },
];

const renderWithDnd = (ui: React.ReactElement) =>
  render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);


describe("ETL Processing Functionality", () => {
  let currentMockFiles = [...initialMockFiles];
  let user: UserEvent;

  beforeEach(() => {
    vi.clearAllMocks(); 
    user = userEvent.setup(); 
    
    currentMockFiles = [...initialMockFiles]; 
    (documentsApi.listFiles as jest.Mock).mockImplementation(async () => currentMockFiles);
    (documentsApi.processFile as jest.Mock).mockImplementation(vi.fn()); 
    
    // Reset the imported mockedSonnerToast methods
    (mockedSonnerToast.loading as jest.Mock).mockClear().mockImplementation(() => 'toast-id');
    (mockedSonnerToast.success as jest.Mock).mockClear();
    (mockedSonnerToast.error as jest.Mock).mockClear();
    (mockedSonnerToast.warning as jest.Mock).mockClear();
  });

  // UC-ETL-001: Click "Process ETL" with one or more files selected.
  it("should call processFile API for each selected file and show appropriate toast", async () => {
    (documentsApi.processFile as jest.Mock).mockResolvedValue({ success: true });
    renderWithDnd(<DocumentsPage />);

    await waitFor(() => expect(screen.getByText("Test.pdf")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Report.xlsx")).toBeInTheDocument());

    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    await user.click(checkboxes[1]); 

    const processEtlButton = screen.getByRole("button", { name: /process etl/i });
    await waitFor(() => expect(processEtlButton).not.toBeDisabled());

    await user.click(processEtlButton);
    
    await waitFor(() => expect(processEtlButton).toBeDisabled());
    
    await waitFor(() => {
      expect(mockedSonnerToast.loading).toHaveBeenCalledWith("Processing 1 file(s) for ETL..."); 
    });

    await waitFor(() => {
      expect(documentsApi.processFile).toHaveBeenCalledTimes(1);
    });
    expect(documentsApi.processFile).toHaveBeenCalledWith(initialMockFiles[1].name, initialMockFiles[1].id);

    await waitFor(() => {
      expect(mockedSonnerToast.success).toHaveBeenCalledWith("Successfully processed 1 file(s)", { id: "toast-id" }); 
    });

    await waitFor(() => {
      // Re-query the checkbox inside waitFor to get the potentially updated element
      // initialMockFiles[1] corresponds to Report.xlsx (checkboxes[1])
      const row = screen.getByRole('row', { name: initialMockFiles[1].name });
      const checkboxInRow = within(row).getByRole('checkbox') as HTMLInputElement;
      expect(checkboxInRow.checked).toBe(false);
    });
    await waitFor(() => expect(processEtlButton).toBeDisabled());
  });

  // UC-ETL-002 (Corrected version based on disabled behavior)
  it("should have a disabled ETL button and not call processFile or show toasts", async () => {
    renderWithDnd(<DocumentsPage />); 
    await waitFor(() => expect(screen.getByText("Test.pdf")).toBeInTheDocument());
    const processEtlButton = screen.getByRole("button", { name: /process etl/i });
    expect(processEtlButton).toBeDisabled();
    await user.click(processEtlButton); 
    expect(mockedSonnerToast.error).not.toHaveBeenCalledWith("Please select files to process");
    expect(mockedSonnerToast.loading).not.toHaveBeenCalled();
    expect(documentsApi.processFile).not.toHaveBeenCalled();
  });

  // UC-ETL-003: Simulate a scenario where all selected files process successfully
  it("should show a success toast and clear selection when all selected files are processed successfully", async () => {
    (documentsApi.processFile as jest.Mock).mockResolvedValue({ success: true });
    renderWithDnd(<DocumentsPage />);

    await waitFor(() => expect(screen.getByText("Test.pdf")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Report.xlsx")).toBeInTheDocument());

    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    await user.click(checkboxes[1]); // Select ONE file for now

    const processEtlButton = screen.getByRole("button", { name: /process etl/i });
    await waitFor(() => expect(processEtlButton).not.toBeDisabled());

    await user.click(processEtlButton);

    await waitFor(() => expect(processEtlButton).toBeDisabled());

    await waitFor(() => {
      expect(mockedSonnerToast.loading).toHaveBeenCalledWith("Processing 1 file(s) for ETL...");
    });

    await waitFor(() => {
      expect(documentsApi.processFile).toHaveBeenCalledTimes(1);
    });
    expect(documentsApi.processFile).toHaveBeenCalledWith(initialMockFiles[1].name, initialMockFiles[1].id);

    await waitFor(() => {
      expect(mockedSonnerToast.success).toHaveBeenCalledWith("Successfully processed 1 file(s)", { id: "toast-id" });
    });

    await waitFor(() => {
      // Re-query the checkbox inside waitFor to get the potentially updated element
      // initialMockFiles[1] corresponds to Report.xlsx (checkboxes[1])
      const row = screen.getByRole('row', { name: initialMockFiles[1].name });
      const checkboxInRow = within(row).getByRole('checkbox') as HTMLInputElement;
      expect(checkboxInRow.checked).toBe(false);
    });
    await waitFor(() => expect(processEtlButton).toBeDisabled());
  });

  // UC-ETL-004: Simulate a scenario where some files process successfully and some fail.
  it("should show a warning toast when some files succeed and some fail during ETL", () => {
    // TODO: Implement test
  });

  // UC-ETL-005: Simulate a scenario where all selected files fail to process.
  it("should show an error toast when all selected files fail to process for ETL", () => {
    // TODO: Implement test
  });

  // UC-ETL-006: Verify isProcessingETL state is true during processing and false after.
  it("should set isProcessingETL to true during processing and false afterwards", () => {
    // TODO: Implement test
  });
}); 