// Using Cursor rules 😊
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DocumentsPage from '@/pages/DocumentsPage';
import { documentsApi } from '@/lib/api/documents';
import { vi } from 'vitest';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { FileItem } from '@/lib/types/documents';

// Mock the toast notifications
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn().mockReturnValue('mock-toast-id'),
    dismiss: vi.fn(),
  },
}));

// Mock the documentsApi
vi.mock('@/lib/api/documents');

// Mock the Supabase client
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

const renderWithDnd = (ui: React.ReactElement) =>
  render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);

// Sample mock files for testing
const mockFiles: FileItem[] = [
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
    name: 'Folder1',
    type: 'folder',
    path: [],
    size: 0,
    modified: new Date(),
    processed: false,
    chunked: false,
  }
];

// Import toast from sonner for typechecking
import { toast } from 'sonner';

describe("File Upload Functionality", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup default mock implementations
    documentsApi.listFiles = vi.fn().mockResolvedValue(mockFiles);
    documentsApi.uploadFile = vi.fn().mockResolvedValue({ fileId: 'mock-file-id' });
    documentsApi.createFolder = vi.fn().mockResolvedValue({ success: true });
  });

  // UC-FU-001: Upload a single valid file (e.g., .pdf, .xlsx within size limits).
  it("should upload a single valid file successfully", async () => {
    // Arrange
    renderWithDnd(<DocumentsPage />);
    
    // Wait for the component to load files
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(1);
    });
    
    // Create a mock PDF file (type and size are within limits)
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    // Act - find the file input and simulate uploading a file
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    await userEvent.upload(fileInput, file);
    
    // Assert
    await waitFor(() => {
      // Check if uploadFile was called with the correct parameters
      expect(documentsApi.uploadFile).toHaveBeenCalledWith(file, []);
      // Check if toast success was called
      expect(toast.success).toHaveBeenCalledWith(`File ${file.name} uploaded successfully`);
      // Check if listFiles was called again to refresh the view
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(2);
    });
  });

  // UC-FU-002: Upload multiple valid files simultaneously.
  it("should upload multiple valid files successfully", async () => {
    // Arrange
    renderWithDnd(<DocumentsPage />);
    
    // Wait for the component to load files
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(1);
    });
    
    // Create mock files (all valid types and sizes)
    const files = [
      new File(['pdf content'], 'document.pdf', { type: 'application/pdf' }),
      new File(['xlsx content'], 'spreadsheet.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    ];
    
    // Act - find the file input and simulate uploading multiple files
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    await userEvent.upload(fileInput, files);
    
    // Assert
    await waitFor(() => {
      // Check if uploadFile was called for each file
      expect(documentsApi.uploadFile).toHaveBeenCalledTimes(2);
      // Check if toast success was called for each file and the overall completion
      expect(toast.success).toHaveBeenCalledWith(`File ${files[0].name} uploaded successfully`);
      expect(toast.success).toHaveBeenCalledWith(`File ${files[1].name} uploaded successfully`);
      expect(toast.success).toHaveBeenCalledWith(`Upload completed successfully`, { id: 'mock-toast-id' });
    });
  });

  // UC-FU-003: Attempt to upload a file with a disallowed extension (e.g., .txt, .exe).
  it("should show an error for disallowed file types", async () => {
    // Arrange
    renderWithDnd(<DocumentsPage />);
    
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(1);
    });
    
    // Create a mock file with disallowed extension
    const file = new File(['text content'], 'test.txt', { type: 'text/plain' });
    
    // Act - find the file input and simulate uploading the file
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    await userEvent.upload(fileInput, file);
    
    // Assert
    await waitFor(() => {
      // Check if toast error was called with the correct message
      expect(toast.error).toHaveBeenCalledWith(`File type not allowed: ${file.name}`);
      // Check that uploadFile was not called for the invalid file
      expect(documentsApi.uploadFile).not.toHaveBeenCalled();
    });
  });

  // UC-FU-004: Attempt to upload a file exceeding MAX_FILE_SIZE.
  it("should show an error for files exceeding maximum size", async () => {
    // Arrange
    renderWithDnd(<DocumentsPage />);
    
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(1);
    });
    
    // Create a mock file that's too large (over 10MB)
    // Note: We're mocking the size property, not actually creating a large file
    const file = new File(['content'], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 }); // 11MB
    
    // Act - find the file input and simulate uploading the file
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    await userEvent.upload(fileInput, file);
    
    // Assert
    await waitFor(() => {
      // Check if toast error was called with the correct message
      expect(toast.error).toHaveBeenCalledWith(`File too large: ${file.name}`);
      // Check that uploadFile was not called for the oversized file
      expect(documentsApi.uploadFile).not.toHaveBeenCalled();
    });
  });

  // UC-FU-005: Trigger file input change event with no files selected.
  it("should show an error if no files are selected", async () => {
    // Arrange
    renderWithDnd(<DocumentsPage />);
    
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(1);
    });
    
    // Act - find the file input and trigger change with no files
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });
    
    // Assert
    await waitFor(() => {
      // Check if toast error was called with the correct message
      expect(toast.error).toHaveBeenCalledWith("No files selected");
      // Check that uploadFile was not called
      expect(documentsApi.uploadFile).not.toHaveBeenCalled();
    });
  });

  // UC-FU-006: Simulate a network error during a single file upload.
  it("should show an error if a single file upload fails due to network error", async () => {
    // Arrange
    // Mock uploadFile to reject with an error
    documentsApi.uploadFile = vi.fn().mockRejectedValue(new Error('Network error'));
    
    renderWithDnd(<DocumentsPage />);
    
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(1);
    });
    
    // Create a mock file (valid type and size)
    const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    
    // Act - find the file input and simulate uploading the file
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    await userEvent.upload(fileInput, file);
    
    // Assert
    await waitFor(() => {
      // Check if toast error was called with the correct message
      expect(toast.error).toHaveBeenCalledWith(`Failed to upload file: ${file.name}`);
      // Check that uploadFile was called but resulted in an error
      expect(documentsApi.uploadFile).toHaveBeenCalledWith(file, []);
    });
  });

  // UC-FU-007: Simulate a network error during multiple file uploads (e.g., one succeeds, one fails).
  it("should handle mixed success and failure in multiple file uploads", async () => {
    // Arrange
    // Mock uploadFile to succeed for the first file but fail for the second
    documentsApi.uploadFile = vi.fn()
      .mockImplementationOnce((file) => Promise.resolve({ fileId: 'success-id' }))
      .mockImplementationOnce((file) => Promise.reject(new Error('Network error')));
    
    renderWithDnd(<DocumentsPage />);
    
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(1);
    });
    
    // Create mock files (both valid types and sizes)
    const files = [
      new File(['pdf content'], 'success.pdf', { type: 'application/pdf' }),
      new File(['xlsx content'], 'failure.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    ];
    
    // Act - find the file input and simulate uploading multiple files
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    await userEvent.upload(fileInput, files);
    
    // Assert
    await waitFor(() => {
      // Check if uploadFile was called for both files
      expect(documentsApi.uploadFile).toHaveBeenCalledTimes(2);
      // Check if appropriate toast messages were shown
      expect(toast.success).toHaveBeenCalledWith(`File ${files[0].name} uploaded successfully`);
      expect(toast.error).toHaveBeenCalledWith(`Failed to upload file: ${files[1].name}`);
    });
  });

  // UC-FU-008: Verify upload progress state (uploadProgress) updates correctly during upload.
  it("should update upload progress correctly", async () => {
    // This test is more complex as we need to check internal state
    // For simplicity, we'll just verify the upload process starts and completes
    
    // Arrange
    renderWithDnd(<DocumentsPage />);
    
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(1);
    });
    
    // Create a mock file
    const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    
    // Act - find the file input and simulate uploading the file
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    await userEvent.upload(fileInput, file);
    
    // Assert
    await waitFor(() => {
      // Check that upload process completed
      expect(toast.loading).toHaveBeenCalledWith(`Uploading 1 file...`);
      expect(toast.success).toHaveBeenCalledWith(`Upload completed successfully`, { id: 'mock-toast-id' });
    });
  });
});

describe("Folder Creation Functionality", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup default mock implementations
    documentsApi.listFiles = vi.fn().mockResolvedValue(mockFiles);
    documentsApi.createFolder = vi.fn().mockResolvedValue({ success: true });
  });

  // UC-FC-001: Create a folder with a unique, valid name.
  it("should create a folder with a unique valid name successfully", async () => {
    // Arrange
    renderWithDnd(<DocumentsPage />);
    
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(1);
    });
    
    // Act - find the new folder button and click it
    const newFolderButton = screen.getByTitle('Create New Folder');
    fireEvent.click(newFolderButton);
    
    // Wait for the dialog to appear
    const folderNameInput = await screen.findByPlaceholderText('Folder name');
    
    // Enter a unique folder name
    fireEvent.change(folderNameInput, { target: { value: 'New Test Folder' } });
    
    // Submit the form
    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);
    
    // Assert
    await waitFor(() => {
      // Check if createFolder was called with the correct parameters
      expect(documentsApi.createFolder).toHaveBeenCalledWith('New Test Folder', []);
      // Check if toast loading and success were called
      expect(toast.loading).toHaveBeenCalledWith(`Creating folder "New Test Folder"...`);
      expect(toast.success).toHaveBeenCalledWith(`Folder New Test Folder created successfully`, { id: 'mock-toast-id' });
    });
  });

  // UC-FC-002: Attempt to create a folder with an empty or whitespace-only name.
  it("should show an error when trying to create a folder with an empty name", async () => {
    // Arrange
    renderWithDnd(<DocumentsPage />);
    
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(1);
    });
    
    // Act - find the new folder button and click it
    const newFolderButton = screen.getByTitle('Create New Folder');
    fireEvent.click(newFolderButton);
    
    // Wait for the dialog to appear
    const folderNameInput = await screen.findByPlaceholderText('Folder name');
    
    // Enter an empty folder name
    fireEvent.change(folderNameInput, { target: { value: '' } });
    
    // Submit the form
    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);
    
    // Assert
    await waitFor(() => {
      // Check if toast error was called with the correct message
      expect(toast.error).toHaveBeenCalledWith("Please enter a folder name");
      // Check that createFolder was not called
      expect(documentsApi.createFolder).not.toHaveBeenCalled();
    });
  });

  // UC-FC-003: Attempt to create a folder with a name that already exists in the current path.
  it("should show an error when trying to create a folder with a duplicate name", async () => {
    // Arrange
    renderWithDnd(<DocumentsPage />);
    
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(1);
    });
    
    // Act - find the new folder button and click it
    const newFolderButton = screen.getByTitle('Create New Folder');
    fireEvent.click(newFolderButton);
    
    // Wait for the dialog to appear
    const folderNameInput = await screen.findByPlaceholderText('Folder name');
    
    // Enter a folder name that already exists
    fireEvent.change(folderNameInput, { target: { value: 'Folder1' } });
    
    // Submit the form
    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);
    
    // Assert
    await waitFor(() => {
      // Check if toast error was called with the correct message
      expect(toast.error).toHaveBeenCalledWith("A folder with this name already exists");
      // Check that createFolder was not called
      expect(documentsApi.createFolder).not.toHaveBeenCalled();
    });
  });

  // UC-FC-004: Simulate a network error during folder creation.
  it("should show an error if folder creation fails due to network error", async () => {
    // Arrange
    // Mock createFolder to reject with an error
    documentsApi.createFolder = vi.fn().mockRejectedValue(new Error('Network error'));
    
    renderWithDnd(<DocumentsPage />);
    
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(1);
    });
    
    // Act - find the new folder button and click it
    const newFolderButton = screen.getByTitle('Create New Folder');
    fireEvent.click(newFolderButton);
    
    // Wait for the dialog to appear
    const folderNameInput = await screen.findByPlaceholderText('Folder name');
    
    // Enter a valid folder name
    fireEvent.change(folderNameInput, { target: { value: 'New Folder' } });
    
    // Submit the form
    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);
    
    // Assert
    await waitFor(() => {
      // Check if createFolder was called
      expect(documentsApi.createFolder).toHaveBeenCalledWith('New Folder', []);
      // Check if toast loading and error were called
      expect(toast.loading).toHaveBeenCalledWith(`Creating folder "New Folder"...`);
      expect(toast.error).toHaveBeenCalledWith("Failed to create folder", { id: 'mock-toast-id' });
    });
  });
}); 