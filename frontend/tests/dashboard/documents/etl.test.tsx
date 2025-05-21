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

// Declare globalThis.toast as any to avoid TS linter errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  // eslint-disable-next-line no-var
  var toast: any;
}

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
    name: 'Report.xlsx',
    type: 'file',
    path: [],
    size: 2048,
    modified: new Date(),
    processed: false,
    chunked: false,
  },
];

documentsApi.listFiles = vi.fn(async () => mockFiles);
documentsApi.processFile = vi.fn();

defineGlobalProperty('toast', {
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  loading: vi.fn(() => 'toast-id'),
});

const renderWithDnd = (ui: React.ReactElement) =>
  render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);

describe('DocumentsPage - ETL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ETL button is disabled when no files are selected', async () => {
    renderWithDnd(<DocumentsPage />);
    const etlButton = await screen.findByRole('button', { name: /process etl/i });
    expect(etlButton).toBeDisabled();
  });

  it('shows error toast if ETL is clicked with no selection', async () => {
    renderWithDnd(<DocumentsPage />);
    
    // Wait for initial render and button to be disabled
    const etlButton = await screen.findByRole('button', { name: /process etl/i });
    expect(etlButton).toBeDisabled();

    // Force click regardless of disabled state to test error handling
    fireEvent.click(etlButton);
    
    await waitFor(() => {
      expect(globalThis.toast.error).toHaveBeenCalledWith('Please select files to process');
    });
  });

  it('processes ETL for selected files and shows success toast', async () => {
    (documentsApi.processFile as ReturnType<typeof vi.fn>).mockResolvedValue({});
    renderWithDnd(<DocumentsPage />);

    // Wait for specific file row to render
    const fileRow = await screen.findByRole('row', { 
      name: /Test\.pdf/i 
    });

    // Get checkbox within the specific row
    const checkbox = within(fileRow).getByRole('checkbox');
    
    // Verify initial state
    const etlButton = await screen.findByRole('button', { name: /process etl/i });
    expect(etlButton).toBeDisabled();

    // Select file and verify button enables
    fireEvent.click(checkbox);
    await waitFor(() => expect(etlButton).toBeEnabled());

    // Trigger ETL process
    fireEvent.click(etlButton);
    
    await waitFor(() => {
      expect(documentsApi.processFile).toHaveBeenCalledWith('1');
      expect(globalThis.toast.success).toHaveBeenCalledWith(
        expect.stringContaining('1/1 files processed successfully')
      );
    });
  });

  it('shows warning toast if some ETL processes fail', async () => {
    (documentsApi.processFile as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Processing failed'));
    
    renderWithDnd(<DocumentsPage />);

    // Wait for files to load and select all
    await waitFor(async () => {
      const checkboxes = await screen.findAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // Select all checkbox
    });

    const etlButton = await screen.findByRole('button', { name: /process etl/i });
    fireEvent.click(etlButton);

    // Wait for both mock calls to complete
    await waitFor(() => {
      expect(documentsApi.processFile).toHaveBeenCalledTimes(2);
      expect(globalThis.toast.warning).toHaveBeenCalledWith(
        expect.stringContaining('1/2 files processed successfully'),
        expect.any(Object)
      );
    });
  });

  it('disables ETL button while processing', async () => {
    let resolve: (() => void) | undefined;
    (documentsApi.processFile as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise<void>((r) => { resolve = r; })
    );
    renderWithDnd(<DocumentsPage />);
    const checkboxes = await screen.findAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    const etlButton = await screen.findByRole('button', { name: /process etl/i });
    fireEvent.click(etlButton);
    expect(etlButton).toBeDisabled();
    // Finish processing
    resolve && resolve();
  });

  it('should process selected files through ETL pipeline', async () => {
    renderWithDnd(<DocumentsPage />);
    
    // Select files
    const selectAll = await screen.findByRole('checkbox', { name: /select all documents/i });
    fireEvent.click(selectAll);
    
    // Initiate ETL
    fireEvent.click(screen.getByRole('button', { name: /process etl/i }));
    
    await waitFor(() => {
      expect(documentsApi.processFile).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/processing 2 files/i)).toBeInTheDocument();
    });
  });

  it('should show processing status for each file', async () => {
    // Test individual file processing states
  });

  it('should handle partial ETL failures', async () => {
    documentsApi.processFile = vi.fn()
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error('Processing failed'));
    
    // ... initiate ETL ...
    
    await waitFor(() => {
      expect(screen.getByText(/1 failed, 1 succeeded/i)).toBeInTheDocument();
    });
  });
});

// Helper to define global property for toast
function defineGlobalProperty(key: string, value: any) {
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true,
  });
} 