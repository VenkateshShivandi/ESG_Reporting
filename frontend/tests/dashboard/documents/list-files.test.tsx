// Using Cursor rules 😊
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentsPage from '@/pages/DocumentsPage';
import { documentsApi } from '@/lib/api/documents';
import type { FileItem } from '@/lib/types/documents';
import { vi } from 'vitest';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

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
    processed: true,
    chunked: true,
  },
  {
    id: '2',
    name: 'FolderA',
    type: 'folder',
    path: [],
    size: 0,
    modified: new Date(),
    processed: false,
    chunked: false,
  },
  {
    id: '3',
    name: 'Report.xlsx',
    type: 'file',
    path: ['FolderA'],
    size: 2048,
    modified: new Date(),
    processed: false,
    chunked: false,
  },
];

documentsApi.listFiles = vi.fn(async (path: string[] = []) => {
  if (path.length === 0) return mockFiles.filter(f => f.path.length === 0);
  return mockFiles.filter(f => JSON.stringify(f.path) === JSON.stringify(path));
});

const renderWithDnd = (ui: React.ReactElement) =>
  render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);

describe('DocumentsPage - List & Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders files and folders in the root', async () => {
    renderWithDnd(<DocumentsPage />);
    expect(await screen.findByText('Test.pdf')).toBeInTheDocument();
    expect(screen.getByText('FolderA')).toBeInTheDocument();
  });

  it('shows empty state if no files/folders', async () => {
    (documentsApi.listFiles as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    renderWithDnd(<DocumentsPage />);
    expect(await screen.findByText('No files in this folder')).toBeInTheDocument();
  });

  it('filters files/folders by search', async () => {
    renderWithDnd(<DocumentsPage />);
    const searchInput = screen.getByPlaceholderText('Search documents...');
    fireEvent.change(searchInput, { target: { value: 'Test' } });
    expect(await screen.findByText('Test.pdf')).toBeInTheDocument();
    expect(screen.queryByText('FolderA')).not.toBeInTheDocument();
  });

  it('navigates into a folder and lists its contents', async () => {
    renderWithDnd(<DocumentsPage />);
    const folder = await screen.findByText('FolderA');
    fireEvent.click(folder);
    expect(await screen.findByText('Report.xlsx')).toBeInTheDocument();
    expect(screen.queryByText('Test.pdf')).not.toBeInTheDocument();
  });

  it('shows Home in breadcrumb and updates on folder navigation', async () => {
    renderWithDnd(<DocumentsPage />);
    expect(await screen.findByText('Home')).toBeInTheDocument();
    const folder = await screen.findByText('FolderA');
    fireEvent.click(folder);
    expect(await screen.findByText('FolderA')).toBeInTheDocument();
    // Breadcrumb should now show Home > FolderA
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('FolderA').length).toBeGreaterThan(0);
  });
}); 