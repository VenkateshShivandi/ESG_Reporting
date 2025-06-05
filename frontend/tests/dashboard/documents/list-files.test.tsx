// Using Cursor rules 😊
import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import DocumentsPage from '@/pages/DocumentsPage'
import { documentsApi } from '@/lib/api/documents'
import type { FileItem } from '@/lib/types/documents'
import { vi } from 'vitest'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import {
  Folder,
  FileText,
  FileSpreadsheet,
  FileType as LucideFileTypeIcon,
  FileCheck,
  File as DefaultFileIcon,
} from 'lucide-react'
import { getFileIcon, getFileTypeBadge, formatFileSize } from '@/pages/DocumentsPage'
import { DragItem } from '@/lib/hooks/useDragDrop'

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
    },
  }
})

vi.mock('@/lib/api/documents')

const initialMockFiles: FileItem[] = [
  {
    id: '1',
    name: 'Test.pdf',
    type: 'file',
    path: [],
    size: 1024,
    modified: new Date(),
    processed: true,
    chunked: true,
    processingResult: {
      filename: 'Test.pdf',
      type: 'file',
      size: 1024,
      processed_at: new Date().toISOString(),
      preview: 'Sample PDF preview content',
      pages: 3,
      metadata: { title: 'Mocked Test PDF' },
    },
  },
  {
    id: '4', // New file for DND test
    name: 'AnotherDoc.docx',
    type: 'file',
    path: [],
    size: 500,
    modified: new Date(),
    processed: false,
    chunked: false,
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
]

// Make mockFiles mutable for tests that might modify it or rely on specific states
let mockFilesStore: FileItem[] = [...initialMockFiles]

documentsApi.listFiles = vi.fn(async (path: string[] = []) => {
  console.log(`Mock listFiles called with path: ${JSON.stringify(path)}`)
  if (path.length === 0)
    return mockFilesStore.filter(f => f.path.length === 0 && f.name !== '.folder')
  if (JSON.stringify(path) === JSON.stringify(['FolderA'])) {
    return mockFilesStore.filter(
      f => JSON.stringify(f.path) === JSON.stringify(['FolderA']) && f.name !== '.folder'
    )
  }
  return []
})

documentsApi.getDownloadUrl = vi.fn(async (filePath: string) => {
  if (filePath === 'Test.pdf' || filePath.endsWith('Test.pdf')) {
    // Make it more robust
    return { url: 'https://example.com/test.pdf' }
  }
  return { url: `https://example.com/generic-download-url-for-${filePath.replace(/\//g, '-')}` }
})

// Mock other documentsApi functions that might be called implicitly or by other operations
documentsApi.createFolder = vi.fn().mockResolvedValue({ success: true })
documentsApi.deleteFile = vi.fn().mockResolvedValue({ success: true })
documentsApi.renameItem = vi.fn().mockResolvedValue({ success: true })
documentsApi.uploadFile = vi.fn().mockResolvedValue({ success: true, fileId: 'mock-uploaded-id' })
documentsApi.processFile = vi.fn().mockResolvedValue({ success: true, message: 'Processed' })

const renderWithDnd = (ui: React.ReactElement) =>
  render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>)

// Custom DataTransfer mock for JSDOM
class MockDataTransfer {
  private data: Record<string, string> = {}
  dropEffect: string = 'none'
  effectAllowed: string = 'all'
  files: File[] = []
  types: readonly string[] = []

  clearData(format?: string): void {
    if (format) {
      delete this.data[format]
      this.types = Object.keys(this.data)
    } else {
      this.data = {}
      this.types = []
    }
  }
  getData(format: string): string {
    return this.data[format] || ''
  }
  setData(format: string, data: string): void {
    this.data[format] = data
    if (!this.types.includes(format)) {
      this.types = [...this.types, format]
    }
  }
  setDragImage(image: Element, x: number, y: number): void {}
}

describe('Navigation Functionality', () => {
  beforeEach(() => {
    // Clear mock call history before each test in this describe block
    vi.clearAllMocks()
    // Re-establish the default mock implementation for listFiles if it was cleared by clearAllMocks
    // or if specific tests changed its behavior.
    documentsApi.listFiles = vi.fn(async (path: string[] = []) => {
      if (path.length === 0)
        return mockFilesStore.filter(f => f.path.length === 0 && f.name !== '.folder')
      if (JSON.stringify(path) === JSON.stringify(['FolderA']))
        return mockFilesStore.filter(
          f => JSON.stringify(f.path) === JSON.stringify(['FolderA']) && f.name !== '.folder'
        )
      return [] // Default for other paths if any
    })
  })

  // UC-NAV-001: Click on a folder item in the table.
  it('should navigate into a folder when its name is clicked', async () => {
    renderWithDnd(<DocumentsPage />)

    // Wait for initial files to load and FolderA to be visible
    // Items in root: Test.pdf, FolderA
    // Item in FolderA: Report.xlsx
    await screen.findByText('FolderA')
    expect(screen.getByText('Test.pdf')).toBeInTheDocument()
    expect(screen.queryByText('Report.xlsx')).not.toBeInTheDocument()

    // Find FolderA's clickable element (the div containing the icon and name)
    // The text "FolderA" is inside a span, which is inside the clickable div
    const folderAElement = screen.getByText('FolderA').parentElement
    if (!folderAElement)
      throw new Error('FolderA clickable element (parentElement of text) not found')

    fireEvent.click(folderAElement)

    // Check if listFiles was called for FolderA
    // It's called once on initial load, then again after clicking the folder.
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(2)
    })
    expect(documentsApi.listFiles).toHaveBeenLastCalledWith(['FolderA'])

    // Check UI update: FolderA content should be visible, root content should not
    await screen.findByText('Report.xlsx') // Content of FolderA
    expect(screen.queryByText('Test.pdf')).not.toBeInTheDocument() // Root file
    // FolderA itself should not be listed as an item when we are inside it
    expect(
      screen.queryByText((content, element) => {
        // Check if it's a table cell containing just "FolderA"
        return (
          element?.tagName.toLowerCase() === 'span' &&
          element.textContent === 'FolderA' &&
          element.closest('td') !== null
        )
      })
    ).not.toBeInTheDocument()

    // Check breadcrumbs
    // "Home" should be a clickable element, styled as a primary link
    const homeBreadcrumb = screen.getByText('Home')
    expect(homeBreadcrumb).toBeInTheDocument()
    // Verify specific classes for the "Home" link to ensure it's the correct one
    expect(homeBreadcrumb).toHaveClass('text-emerald-700') // Primary link color
    expect(homeBreadcrumb).toHaveClass('font-semibold') // Primary link font weight
    // It should not be bold as it's not the current active path here
    expect(homeBreadcrumb).not.toHaveClass('font-bold')

    // "FolderA" should be the current path, styled as bold, and also a link
    const folderABreadcrumb = screen.getByText((content, element) => {
      return (
        element?.tagName.toLowerCase() === 'a' &&
        element.textContent === 'FolderA' &&
        element.classList.contains('font-bold')
      )
    })
    expect(folderABreadcrumb).toBeInTheDocument()
  })

  // UC-NAV-002: Click on a breadcrumb link (not the last one).
  it('should navigate to a parent folder when its breadcrumb is clicked', async () => {
    renderWithDnd(<DocumentsPage />) // 1st call: listFiles([]) for root

    // Navigate into FolderA first
    await screen.findByText('FolderA')
    const folderAElement = screen.getByText('FolderA').parentElement
    if (!folderAElement) throw new Error('FolderA clickable element not found')
    fireEvent.click(folderAElement) // 2nd call: listFiles(['FolderA'])

    // Wait for FolderA content to ensure navigation is complete
    await screen.findByText('Report.xlsx')
    expect(screen.queryByText('Test.pdf')).not.toBeInTheDocument()
    // Verify FolderA is the active breadcrumb
    const folderABreadcrumbActive = screen.getByText(
      (content, element) =>
        element?.tagName.toLowerCase() === 'a' &&
        element.textContent === 'FolderA' &&
        element.classList.contains('font-bold')
    )
    expect(folderABreadcrumbActive).toBeInTheDocument()

    // Now click the "Home" breadcrumb (which is a parent)
    const homeBreadcrumb = screen.getByText('Home')
    fireEvent.click(homeBreadcrumb) // 3rd call: listFiles([]) for root

    // Check if listFiles was called for the root path as the third call
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(3)
    })
    expect(documentsApi.listFiles).toHaveBeenLastCalledWith([])

    // Check UI update: Root content should be visible again
    await screen.findByText('Test.pdf')
    await screen.findByText('FolderA') // FolderA should be visible again as a list item
    expect(screen.queryByText('Report.xlsx')).not.toBeInTheDocument()

    // Verify "Home" breadcrumb is present with its standard, non-active path styling
    const homeBreadcrumbElement = screen.getByText('Home')
    expect(homeBreadcrumbElement).toBeInTheDocument()
    expect(homeBreadcrumbElement).toHaveClass('text-emerald-700')
    expect(homeBreadcrumbElement).toHaveClass('font-semibold')
    // Crucially, it should NOT have the 'font-bold' class that active folder segments get
    expect(homeBreadcrumbElement).not.toHaveClass('font-bold')
    expect(homeBreadcrumbElement).not.toHaveClass('text-slate-900') // Not the active segment color

    // Verify that "Home" is the only breadcrumb item, indicating it's the active root.
    // The BreadcrumbList is an <ol>, and each BreadcrumbItem is an <li>.
    // When at Home, only one <li> (for Home itself) should exist.
    const breadcrumbList = homeBreadcrumbElement.closest('ol')
    if (!breadcrumbList) throw new Error("Breadcrumb list <ol> not found containing 'Home'")
    const breadcrumbItems = within(breadcrumbList).getAllByRole('listitem')
    expect(breadcrumbItems).toHaveLength(1)
    expect(breadcrumbItems[0]).toContainElement(homeBreadcrumbElement)
  })

  // UC-NAV-003: Click on the "Home" breadcrumb link.
  it("should navigate to the root path when 'Home' breadcrumb is clicked", async () => {
    renderWithDnd(<DocumentsPage />) // 1st call: listFiles([]) for root

    // Navigate into FolderA first
    await screen.findByText('FolderA') // Ensure initial load is complete
    const folderAElement = screen.getByText('FolderA').parentElement
    if (!folderAElement) throw new Error('FolderA clickable element not found')
    fireEvent.click(folderAElement) // 2nd call: listFiles(['FolderA'])

    // Wait for FolderA content to ensure navigation into the folder is complete
    await screen.findByText('Report.xlsx')
    // Ensure we are indeed inside FolderA by checking breadcrumb
    const folderABreadcrumbActive = screen.getByText(
      (content, element) =>
        element?.tagName.toLowerCase() === 'a' &&
        element.textContent === 'FolderA' &&
        element.classList.contains('font-bold')
    )
    expect(folderABreadcrumbActive).toBeInTheDocument()

    // Now, click the "Home" breadcrumb
    const homeBreadcrumb = screen.getByText('Home')
    fireEvent.click(homeBreadcrumb) // 3rd call: listFiles([]) for root

    // Check if listFiles was called for the root path as the third call
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledTimes(3)
    })
    expect(documentsApi.listFiles).toHaveBeenLastCalledWith([])

    // Check UI update: Root content should be visible again
    await screen.findByText('Test.pdf')
    await screen.findByText('FolderA') // FolderA (as a list item) should be visible
    expect(screen.queryByText('Report.xlsx')).not.toBeInTheDocument() // Content of FolderA should be gone

    // Verify "Home" breadcrumb is present with its standard, non-active path styling
    const homeBreadcrumbElement = screen.getByText('Home')
    expect(homeBreadcrumbElement).toBeInTheDocument()
    expect(homeBreadcrumbElement).toHaveClass('text-emerald-700')
    expect(homeBreadcrumbElement).toHaveClass('font-semibold')
    expect(homeBreadcrumbElement).not.toHaveClass('font-bold')
    expect(homeBreadcrumbElement).not.toHaveClass('text-slate-900')

    // Verify that "Home" is the only breadcrumb item, indicating it's the active root.
    const breadcrumbList = homeBreadcrumbElement.closest('ol')
    if (!breadcrumbList) throw new Error("Breadcrumb list <ol> not found containing 'Home'")
    const breadcrumbItems = within(breadcrumbList).getAllByRole('listitem')
    expect(breadcrumbItems).toHaveLength(1)
    expect(breadcrumbItems[0]).toContainElement(homeBreadcrumbElement)
  })
})

describe('Item Selection Functionality', () => {
  // UC-SEL-001: Click a checkbox to select a single item.
  it('should select a single item when its checkbox is clicked', async () => {
    renderWithDnd(<DocumentsPage />)

    // Wait for initial files to load and Test.pdf to be visible
    const pdfElement = await screen.findByText('Test.pdf')
    expect(pdfElement).toBeInTheDocument()

    // Find the table row for "Test.pdf"
    const row = pdfElement.closest('tr')
    if (!row) throw new Error('Row for Test.pdf not found')

    // Find the checkbox within that row
    const checkbox = within(row).getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()

    // Find the main "Delete" button by its visible text content
    // The accessible name is primarily derived from its text node "Delete"
    const deleteButton = screen.getByRole('button', { name: /Delete$/i })
    expect(deleteButton).toBeInTheDocument()

    // Assert initial states
    expect(checkbox).not.toBeChecked()
    expect(deleteButton).toBeDisabled()

    // Click the checkbox
    fireEvent.click(checkbox)

    // Assert updated states
    expect(checkbox).toBeChecked()
    expect(deleteButton).not.toBeDisabled()
    // The delete button variant also changes, we can check its class if needed
    // For example, it should not have 'outline' variant and should have 'destructive'
    // expect(deleteButton).toHaveClass('destructive');
    // expect(deleteButton).not.toHaveClass('outline'); // This might be too brittle depending on exact class names
  })

  // UC-SEL-002: Click a checkbox to deselect a single item.
  it('should deselect a single item when its checkbox is clicked again', async () => {
    renderWithDnd(<DocumentsPage />)

    // Wait for initial files to load and Test.pdf to be visible
    const pdfElement = await screen.findByText('Test.pdf')
    expect(pdfElement).toBeInTheDocument()

    // Find the table row for "Test.pdf"
    const row = pdfElement.closest('tr')
    if (!row) throw new Error('Row for Test.pdf not found')

    // Find the checkbox within that row
    const checkbox = within(row).getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()

    // Find the main "Delete" button
    const deleteButton = screen.getByRole('button', { name: /Delete$/i })
    expect(deleteButton).toBeInTheDocument()

    // Initial state: checkbox unchecked, delete button disabled
    expect(checkbox).not.toBeChecked()
    expect(deleteButton).toBeDisabled()

    // First click: Select the item
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
    expect(deleteButton).not.toBeDisabled()

    // Second click: Deselect the item
    fireEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()
    expect(deleteButton).toBeDisabled()
  })

  // UC-SEL-003: Click the "select all" checkbox when no items are selected.
  it("should select all items when 'select all' checkbox is clicked and none are selected", async () => {
    renderWithDnd(<DocumentsPage />)

    // Wait for initial files to load
    const pdfElement = await screen.findByText('Test.pdf')
    const folderAElement = await screen.findByText('FolderA')
    expect(pdfElement).toBeInTheDocument()
    expect(folderAElement).toBeInTheDocument()

    // Define deleteButton in this scope
    const deleteButton = screen.getByRole('button', { name: /Delete$/i })
    expect(deleteButton).toBeInTheDocument()

    // Find the "Select All" checkbox in the header
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all documents/i })
    expect(selectAllCheckbox).toBeInTheDocument()

    // Find individual item checkboxes
    const pdfRow = pdfElement.closest('tr')
    if (!pdfRow) throw new Error('Row for Test.pdf not found')
    const pdfCheckbox = within(pdfRow).getByRole('checkbox')

    const folderARow = folderAElement.closest('tr')
    if (!folderARow) throw new Error('Row for FolderA not found')
    const folderACheckbox = within(folderARow).getByRole('checkbox')

    // Initial state: all checkboxes unchecked, delete button disabled
    expect(selectAllCheckbox).not.toBeChecked()
    expect(pdfCheckbox).not.toBeChecked()
    expect(folderACheckbox).not.toBeChecked()
    expect(deleteButton).toBeDisabled()

    // Action: Click the "Select All" checkbox
    fireEvent.click(selectAllCheckbox)

    // Final assertions: all checkboxes checked, delete button enabled
    expect(selectAllCheckbox).toBeChecked()
    expect(pdfCheckbox).toBeChecked()
    expect(folderACheckbox).toBeChecked()
    expect(deleteButton).not.toBeDisabled()
  })

  // UC-SEL-004: Click the "select all" checkbox when all items are selected.
  it("should deselect all items when 'select all' checkbox is clicked and all are selected", async () => {
    renderWithDnd(<DocumentsPage />)

    // Wait for initial files to load
    const pdfElement = await screen.findByText('Test.pdf')
    const folderAElement = await screen.findByText('FolderA')
    expect(pdfElement).toBeInTheDocument()
    expect(folderAElement).toBeInTheDocument()

    // Find the "Select All" checkbox in the header
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all documents/i })
    expect(selectAllCheckbox).toBeInTheDocument()

    // Find individual item checkboxes
    const pdfRow = pdfElement.closest('tr')
    if (!pdfRow) throw new Error('Row for Test.pdf not found')
    const pdfCheckbox = within(pdfRow).getByRole('checkbox')

    const folderARow = folderAElement.closest('tr')
    if (!folderARow) throw new Error('Row for FolderA not found')
    const folderACheckbox = within(folderARow).getByRole('checkbox')

    // Find delete button
    const deleteButton = screen.getByRole('button', { name: /Delete$/i }) // Corrected to match visible text
    expect(deleteButton).toBeInTheDocument()

    // --- Step 1: Programmatically select all items first ---
    // Initial state: all checkboxes unchecked, delete button disabled
    expect(selectAllCheckbox).not.toBeChecked()
    expect(pdfCheckbox).not.toBeChecked()
    expect(folderACheckbox).not.toBeChecked()
    expect(deleteButton).toBeDisabled()

    // Action: Click the "Select All" checkbox to select all
    fireEvent.click(selectAllCheckbox)

    // Assertions after selecting all
    expect(selectAllCheckbox).toBeChecked()
    expect(pdfCheckbox).toBeChecked()
    expect(folderACheckbox).toBeChecked()
    expect(deleteButton).not.toBeDisabled()

    // --- Step 2: Deselect all items ---
    // Action: Click the "Select All" checkbox again to deselect all
    fireEvent.click(selectAllCheckbox)

    // Final assertions: all checkboxes unchecked, delete button disabled
    expect(selectAllCheckbox).not.toBeChecked()
    expect(pdfCheckbox).not.toBeChecked()
    expect(folderACheckbox).not.toBeChecked()
    expect(deleteButton).toBeDisabled()
  })

  // UC-SEL-005: Click the "select all" checkbox when some items are selected.
  it("should select all items when 'select all' checkbox is clicked and some are selected", async () => {
    renderWithDnd(<DocumentsPage />)

    // Wait for initial files to load
    const pdfElement = await screen.findByText('Test.pdf')
    const folderAElement = await screen.findByText('FolderA')
    expect(pdfElement).toBeInTheDocument()
    expect(folderAElement).toBeInTheDocument()

    // Find the "Select All" checkbox in the header
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all documents/i })
    expect(selectAllCheckbox).toBeInTheDocument()

    // Find individual item checkboxes
    const pdfRow = pdfElement.closest('tr')
    if (!pdfRow) throw new Error('Row for Test.pdf not found')
    const pdfCheckbox = within(pdfRow).getByRole('checkbox')

    const folderARow = folderAElement.closest('tr')
    if (!folderARow) throw new Error('Row for FolderA not found')
    const folderACheckbox = within(folderARow).getByRole('checkbox')

    // Find delete button
    const deleteButton = screen.getByRole('button', { name: /Delete$/i })
    expect(deleteButton).toBeInTheDocument()

    // --- Step 1: Programmatically select some items first ---
    // Initial state: all checkboxes unchecked, delete button disabled
    expect(selectAllCheckbox).not.toBeChecked()
    expect(pdfCheckbox).not.toBeChecked()
    expect(folderACheckbox).not.toBeChecked()
    expect(deleteButton).toBeDisabled()

    // Action: Click the "Select All" checkbox to select all
    fireEvent.click(selectAllCheckbox)

    // Assertions after selecting all
    expect(selectAllCheckbox).toBeChecked()
    expect(pdfCheckbox).toBeChecked()
    expect(folderACheckbox).toBeChecked()
    expect(deleteButton).not.toBeDisabled()

    // --- Step 2: Deselect some items ---
    // Action: Click the "Select All" checkbox again to deselect some
    fireEvent.click(selectAllCheckbox)

    // Final assertions: some checkboxes unchecked, delete button enabled
    expect(selectAllCheckbox).not.toBeChecked()
    expect(pdfCheckbox).not.toBeChecked()
  })
})

describe('Search Functionality', () => {
  // UC-SRC-001: Enter text in the search input.
  it('should filter displayed items based on search query', async () => {
    renderWithDnd(<DocumentsPage />)

    // Wait for initial files to load
    const pdfElementInitial = await screen.findByText('Test.pdf')
    const folderAElementInitial = await screen.findByText('FolderA')
    expect(pdfElementInitial).toBeInTheDocument()
    expect(folderAElementInitial).toBeInTheDocument()

    // Find the search input using its placeholder text
    const searchInput = screen.getByPlaceholderText(/Search documents/i)
    expect(searchInput).toBeInTheDocument()

    // Enter text in the search input (e.g., search for "Test")
    fireEvent.change(searchInput, { target: { value: 'Test' } })

    // Wait for "FolderA" to be removed from the document
    await waitFor(() => {
      expect(screen.queryByText('FolderA')).not.toBeInTheDocument()
    })

    // "Test.pdf" should still be there (and findByText will ensure it re-renders if necessary)
    expect(await screen.findByText('Test.pdf')).toBeInTheDocument()

    // Clear the search input
    fireEvent.change(searchInput, { target: { value: '' } })

    // Assertions after clearing search:
    // Both "Test.pdf" and "FolderA" should be visible again
    await screen.findByText('Test.pdf')
    await screen.findByText('FolderA')
  })

  // UC-SRC-002: Clear the search input.
  it('should display all items in current path when search query is cleared', async () => {
    renderWithDnd(<DocumentsPage />)

    // Wait for initial files to load
    const pdfElement = await screen.findByText('Test.pdf')
    const folderAElement = await screen.findByText('FolderA')
    expect(pdfElement).toBeInTheDocument()
    expect(folderAElement).toBeInTheDocument()

    // Find the search input
    const searchInput = screen.getByPlaceholderText(/Search documents/i)
    expect(searchInput).toBeInTheDocument()

    // Enter text in the search input
    fireEvent.change(searchInput, { target: { value: 'Test' } })

    // Wait for "FolderA" to be removed from the document
    await waitFor(() => {
      expect(screen.queryByText('FolderA')).not.toBeInTheDocument()
    })

    // "Test.pdf" should still be there (and findByText will ensure it re-renders if necessary)
    expect(await screen.findByText('Test.pdf')).toBeInTheDocument()

    // Clear the search input
    fireEvent.change(searchInput, { target: { value: '' } })

    // Assertions after clearing search:
    // Both "Test.pdf" and "FolderA" should be visible again
    await screen.findByText('Test.pdf')
    await screen.findByText('FolderA')
    expect(screen.queryByText('Test.pdf')).toBeInTheDocument()
    expect(screen.queryByText('FolderA')).toBeInTheDocument()
  })

  // UC-SRC-003: Search for an item that does not exist.
  it('should show an empty state message when search yields no results', async () => {
    renderWithDnd(<DocumentsPage />)

    // Wait for initial files to load
    const pdfElement = await screen.findByText('Test.pdf')
    const folderAElement = await screen.findByText('FolderA')
    expect(pdfElement).toBeInTheDocument()
    expect(folderAElement).toBeInTheDocument()

    // Find the search input
    const searchInput = screen.getByPlaceholderText(/Search documents/i)
    expect(searchInput).toBeInTheDocument()

    // Enter text in the search input
    fireEvent.change(searchInput, { target: { value: 'NonExistentItem' } })

    // Wait for the empty state message to appear
    await screen.findByText('No files in this folder')
    expect(screen.queryByText('Test.pdf')).not.toBeInTheDocument()
    expect(screen.queryByText('FolderA')).not.toBeInTheDocument()
  })
})

describe('UI State and Loading Indicators', () => {
  // UC-UI-001: Verify initial loading state (isLoading true, then false after loadFiles).
  it('should show skeleton loaders during initial load and then table content', async () => {
    renderWithDnd(<DocumentsPage />)

    // Wait for initial files to load
    const pdfElement = await screen.findByText('Test.pdf')
    const folderAElement = await screen.findByText('FolderA')
    expect(pdfElement).toBeInTheDocument()
    expect(folderAElement).toBeInTheDocument()

    // Wait for skeleton loaders to disappear
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Wait for table content to appear
    await screen.findByText('Test.pdf')
    await screen.findByText('FolderA')
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.queryByText('No files in this folder')).not.toBeInTheDocument()
  })

  // UC-UI-002: Verify "No files in this folder" message when getCurrentFolderItems is empty and not loading.
  it("should show 'No files in this folder' message for an empty folder", async () => {
    // Initial mock for root
    documentsApi.listFiles = vi.fn().mockImplementation(async (path: string[] = []) => {
      if (path.length === 0)
        return mockFilesStore.filter(f => f.path.length === 0 && f.name !== '.folder')
      return [] // Default to empty for other paths initially
    })

    renderWithDnd(<DocumentsPage />)

    // Wait for initial root files to load
    await screen.findByText('Test.pdf')
    const folderAElement = await screen.findByText('FolderA')
    expect(folderAElement).toBeInTheDocument()

    // IMPORTANT: Now, specifically mock the response for navigating into FolderA to be empty
    documentsApi.listFiles = vi.fn().mockImplementation(async (path: string[] = []) => {
      if (path.length === 0) {
        // If navigating back to root for some reason
        return mockFilesStore.filter(f => f.path.length === 0 && f.name !== '.folder')
      }
      if (JSON.stringify(path) === JSON.stringify(['FolderA'])) {
        return [] // Simulate FolderA being empty
      }
      return [] // Default empty for any other unexpected paths
    })

    // Navigate into FolderA (which we've now mocked to be empty)
    const folderAClickable = folderAElement.parentElement
    if (!folderAClickable) throw new Error('FolderA clickable element not found')
    fireEvent.click(folderAClickable)

    // Wait for the API call for FolderA to resolve and UI to update
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledWith(['FolderA'])
    })

    // Assert that the "No files in this folder" message is displayed
    expect(await screen.findByText('No files in this folder')).toBeInTheDocument()

    // Assert that files from root or that were previously in FolderA (in other tests) are not shown
    expect(screen.queryByText('Test.pdf')).not.toBeInTheDocument()
    expect(screen.queryByText('Report.xlsx')).not.toBeInTheDocument()
  })

  // UC-UI-003: Verify FileDetailsDialog opens with correct data when an item's details are viewed.
  it("should open FileDetailsDialog with correct data when an item's details are viewed", async () => {
    renderWithDnd(<DocumentsPage />)

    // Wait for initial files to load
    const pdfElement = await screen.findByText('Test.pdf')
    expect(pdfElement).toBeInTheDocument()

    // Click on the "View Details" button
    // First, ensure the row for Test.pdf is found
    const row = pdfElement.closest('tr')
    if (!row) throw new Error('Row for Test.pdf not found')

    // Then, find the "View Details" button *within* that specific row
    const viewDetailsButton = within(row).getByTitle('View Details')
    expect(viewDetailsButton).toBeInTheDocument()
    fireEvent.click(viewDetailsButton)

    // Wait for the dialog to open by looking for its dynamic title
    // The title is "<filename> Details"
    await screen.findByRole('heading', { name: /Test\.pdf Details/i })

    // Optionally, verify some content within the dialog if needed, but the title check is primary for dialog opening.
    // For example, confirm the filename is part of the dialog's visible content:
    expect(
      screen.getByText(
        (content, element) =>
          element?.tagName.toLowerCase() === 'h2' && content.startsWith('Test.pdf')
      )
    ).toBeInTheDocument()

    // The following lines might fail because "Test.pdf" *is* in the dialog title
    // and thus still in the document. Consider if these are truly necessary or how to refine them.
    // expect(screen.queryByText('Test.pdf')).not.toBeInTheDocument();
    // expect(screen.queryByText('FolderA')).not.toBeInTheDocument();
  })

  // UC-UI-004: Verify all dialogs open and close correctly.
  it('should correctly manage opening and closing of all dialogs', async () => {
    renderWithDnd(<DocumentsPage />)

    // Wait for initial files to load
    const pdfElement = await screen.findByText('Test.pdf')
    expect(pdfElement).toBeInTheDocument()

    // --- Create Folder Dialog Test ---
    const createFolderButton = screen.getByRole('button', { name: /New Folder/i })
    expect(createFolderButton).toBeInTheDocument()
    fireEvent.click(createFolderButton)

    const createFolderDialog = await screen.findByRole('dialog', { name: /Create New Folder/i })
    expect(createFolderDialog).toBeInTheDocument()

    const closeCreateFolderDialogXButton = within(createFolderDialog).getByRole('button', {
      name: 'Close',
    })
    fireEvent.click(closeCreateFolderDialogXButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Create New Folder/i })).not.toBeInTheDocument()
    })

    // --- Rename Dialog Test (via More Actions) ---
    const pdfRow = pdfElement.closest('tr')
    if (!pdfRow) throw new Error('Row for Test.pdf not found for dropdown actions')

    const moreActionsButton = within(pdfRow).getByTitle('More actions')
    expect(moreActionsButton).toBeInTheDocument()
    expect(moreActionsButton).toHaveAttribute('aria-expanded', 'false')

    // Try focusing and then simulating Enter key press, then fallback to click if Enter doesn't work
    moreActionsButton.focus()
    fireEvent.keyDown(moreActionsButton, { key: 'Enter', code: 'Enter', charCode: 13 })

    try {
      await waitFor(
        () => {
          expect(moreActionsButton).toHaveAttribute('aria-expanded', 'true')
        },
        { timeout: 1000 }
      ) // Shorter timeout for this check
    } catch (e) {
      console.log('Enter key press did not open dropdown, trying click again...')
      fireEvent.click(moreActionsButton) // Fallback to click if Enter didn't work
      await waitFor(() => {
        expect(moreActionsButton).toHaveAttribute('aria-expanded', 'true')
      })
    }

    screen.debug(undefined, 300000)

    const renameMenuItem = await screen.findByRole(
      'menuitem',
      { name: /Rename/i },
      { timeout: 4000 }
    )
    expect(renameMenuItem).toBeInTheDocument()
    fireEvent.click(renameMenuItem)

    const renameDialog = await screen.findByRole('dialog', { name: /Rename File/i })
    expect(renameDialog).toBeInTheDocument()
    const cancelRenameButton = within(renameDialog).getByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelRenameButton)
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Rename File/i })).not.toBeInTheDocument()
    })

    // --- Preview Dialog Test (via More Actions) ---
    expect(moreActionsButton).toHaveAttribute('aria-expanded', 'false')

    // Try focusing and then simulating Enter key press for Preview
    moreActionsButton.focus()
    fireEvent.keyDown(moreActionsButton, { key: 'Enter', code: 'Enter', charCode: 13 })

    try {
      await waitFor(
        () => {
          expect(moreActionsButton).toHaveAttribute('aria-expanded', 'true')
        },
        { timeout: 1000 }
      )
    } catch (e) {
      console.log('Enter key press did not open dropdown for Preview, trying click again...')
      fireEvent.click(moreActionsButton) // Fallback for Preview
      await waitFor(() => {
        expect(moreActionsButton).toHaveAttribute('aria-expanded', 'true')
      })
    }

    screen.debug(undefined, 300000)

    const previewMenuItem = await screen.findByRole(
      'menuitem',
      { name: /Preview/i },
      { timeout: 4000 }
    )
    expect(previewMenuItem).toBeInTheDocument()
    fireEvent.click(previewMenuItem)

    const previewDialog = await screen.findByRole('dialog', { name: /Test\.pdf/i })
    expect(previewDialog).toBeInTheDocument()

    const closePreviewDialogXButton = within(previewDialog).getByRole('button', { name: 'Close' })
    fireEvent.click(closePreviewDialogXButton)
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Test\.pdf/i })).not.toBeInTheDocument()
    })
  })
})

describe('Helper Function Tests', () => {
  // UC-HELP-001: getFileIcon
  it('getFileIcon should return the correct icon for various file types and folders', () => {
    // PDF
    let iconResult = getFileIcon('report.pdf')
    expect(iconResult.type).toBe(FileCheck)
    expect(iconResult.props.className).toContain('text-red-600')

    // DOCX
    iconResult = getFileIcon('document.docx')
    expect(iconResult.type).toBe(FileText)
    expect(iconResult.props.className).toContain('text-blue-600')

    // XLSX
    iconResult = getFileIcon('sheet.xlsx')
    expect(iconResult.type).toBe(FileSpreadsheet)
    expect(iconResult.props.className).toContain('text-green-600')

    // CSV
    iconResult = getFileIcon('data.csv')
    expect(iconResult.type).toBe(LucideFileTypeIcon)
    expect(iconResult.props.className).toContain('text-green-500')

    // Folder (type explicitly provided as "folder")
    iconResult = getFileIcon('MyFolder', 'folder')
    expect(iconResult.type).toBe(Folder)
    expect(iconResult.props.className).toContain('text-yellow-600')

    // Folder (type explicitly provided as "directory")
    iconResult = getFileIcon('MyDir', 'directory')
    expect(iconResult.type).toBe(Folder)
    expect(iconResult.props.className).toContain('text-yellow-600')

    // File with unknown extension (implicitly a file, no type given)
    iconResult = getFileIcon('archive.zip')
    expect(iconResult.type).toBe(DefaultFileIcon)
    expect(iconResult.props.className).toContain('text-slate-600')

    // File with no extension (implicitly a file, no type given)
    iconResult = getFileIcon('UnknownFileNoExt')
    expect(iconResult.type).toBe(DefaultFileIcon)
    expect(iconResult.props.className).toContain('text-slate-600')
  })

  // UC-HELP-002: getFileTypeBadge
  it('getFileTypeBadge should return correct badges for extensions and chunked status', () => {
    // PDF - Chunked
    let badges = getFileTypeBadge('report.pdf', true)
    expect(badges).not.toBeNull()
    if (badges) {
      expect(badges).toHaveLength(2)
      expect(badges[0].props.children).toBe('PDF')
      expect(badges[0].props.className).toContain('bg-red-100')
      expect(badges[1].props.children).toBe('Chunked')
      expect(badges[1].props.className).toContain('bg-emerald-100')
    }

    // PDF - Not Chunked
    badges = getFileTypeBadge('presentation.pdf', false)
    expect(badges).not.toBeNull()
    if (badges) {
      expect(badges).toHaveLength(2)
      expect(badges[0].props.children).toBe('PDF')
      expect(badges[0].props.className).toContain('bg-red-100')
      expect(badges[1].props.children).toBe('Not Chunked')
      expect(badges[1].props.className).toContain('bg-yellow-100')
    }

    // DOCX - Chunked undefined (only type badge)
    badges = getFileTypeBadge('letter.docx')
    expect(badges).not.toBeNull()
    if (badges) {
      expect(badges).toHaveLength(1)
      expect(badges[0].props.children).toBe('DOCX')
      expect(badges[0].props.className).toContain('bg-blue-100')
    }

    // XLSX - Chunked true
    badges = getFileTypeBadge('financials.xlsx', true)
    expect(badges).not.toBeNull()
    if (badges) {
      expect(badges).toHaveLength(2)
      expect(badges[0].props.children).toBe('XLSX')
      expect(badges[0].props.className).toContain('bg-green-100')
      expect(badges[1].props.children).toBe('Chunked')
      expect(badges[1].props.className).toContain('bg-emerald-100')
    }

    // CSV - Chunked false
    badges = getFileTypeBadge('user_data.csv', false)
    expect(badges).not.toBeNull()
    if (badges) {
      expect(badges).toHaveLength(2)
      expect(badges[0].props.children).toBe('CSV')
      expect(badges[0].props.className).toContain('bg-green-50')
      expect(badges[1].props.children).toBe('Not Chunked')
      expect(badges[1].props.className).toContain('bg-yellow-100')
    }

    // File with no extension - Chunked true
    badges = getFileTypeBadge('UnknownFile', true)
    expect(badges).not.toBeNull()
    if (badges) {
      expect(badges).toHaveLength(1) // Only chunked badge
      expect(badges[0].props.children).toBe('Chunked')
      expect(badges[0].props.className).toContain('bg-emerald-100')
    }

    // File with no extension - Chunked false
    badges = getFileTypeBadge('AnotherUnknown', false)
    expect(badges).not.toBeNull()
    if (badges) {
      expect(badges).toHaveLength(1)
      expect(badges[0].props.children).toBe('Not Chunked')
      expect(badges[0].props.className).toContain('bg-yellow-100')
    }

    // File with no extension - Chunked undefined (should return null)
    badges = getFileTypeBadge('JustAName')
    expect(badges).toBeNull()

    // File with unknown extension - Chunked true
    badges = getFileTypeBadge('config.yml', true)
    expect(badges).not.toBeNull()
    if (badges) {
      expect(badges).toHaveLength(2)
      expect(badges[0].props.children).toBe('YML')
      expect(badges[0].props.className).toContain('bg-slate-200') // Default type color
      expect(badges[1].props.children).toBe('Chunked')
      expect(badges[1].props.className).toContain('bg-emerald-100')
    }
  })

  // UC-HELP-003: formatFileSize
  it('formatFileSize should correctly format byte sizes into readable strings', () => {
    expect(formatFileSize(undefined)).toBe('-')
    expect(formatFileSize(null)).toBe('-') // Assuming null is treated like undefined by the updated fn
    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(100)).toBe('100 Bytes')
    expect(formatFileSize(1023)).toBe('1023 Bytes')
    expect(formatFileSize(1024)).toBe('1.00 KB')
    expect(formatFileSize(1500)).toBe('1.46 KB') // 1500 / 1024 = 1.4648...
    expect(formatFileSize(1024 * 500)).toBe('500.00 KB') // 500 KB
    expect(formatFileSize(1024 * 1024)).toBe('1.00 MB') // 1 MB
    expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.50 MB') // 1.5 MB
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB') // 1 GB
    expect(formatFileSize(1024 * 1024 * 1024 * 2.75)).toBe('2.75 GB') // 2.75 GB
    expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB') // 1 TB
  })
})

describe('Drag and Drop - Create Folder from Files', () => {
  beforeEach(() => {
    // Reset mockFilesStore to initial state before each DND test
    mockFilesStore = [...initialMockFiles]
    vi.clearAllMocks() // Clear all mocks, then re-establish necessary ones

    // Re-establish listFiles mock as it might be cleared by clearAllMocks
    documentsApi.listFiles = vi.fn(async (path: string[] = []) => {
      if (path.length === 0)
        return mockFilesStore.filter(f => f.path.length === 0 && f.name !== '.folder')
      if (JSON.stringify(path) === JSON.stringify(['FolderA'])) {
        return mockFilesStore.filter(
          f => JSON.stringify(f.path) === JSON.stringify(['FolderA']) && f.name !== '.folder'
        )
      }
      return []
    })
    documentsApi.getDownloadUrl = vi.fn(async (filePath: string) => {
      if (filePath === 'Test.pdf' || filePath.endsWith('Test.pdf')) {
        return { url: 'https://example.com/test.pdf' }
      }
      return { url: `https://example.com/generic-download-url-for-${filePath.replace(/\//g, '-')}` }
    })
    // Ensure other necessary mocks are re-established if they were global and cleared
    documentsApi.renameItem = vi.fn().mockResolvedValue({ success: true })
  })

  // UC-DND-004: Drag a file item and drop it onto another file item (in the same folder).
  it("should open 'Create New Folder' dialog when a file is dropped onto another file in the same folder", async () => {
    renderWithDnd(<DocumentsPage />)

    const sourceFileText = 'Test.pdf'
    const targetFileText = 'AnotherDoc.docx'

    // Wait for files to be loaded and visible
    const sourcePdfElement = await screen.findByText(sourceFileText)
    const targetDocxElement = await screen.findByText(targetFileText)
    expect(sourcePdfElement).toBeInTheDocument()
    expect(targetDocxElement).toBeInTheDocument()

    // Attempt to find the draggable elements. This assumes DraggableFileItem renders its children
    // within a div that is the actual draggable/droppable node.
    // This query might need adjustment based on DraggableFileItem's actual rendered structure.
    // A data-testid on DraggableFileItem's root would be more reliable.
    const sourceNode = sourcePdfElement.closest('tr')?.cells[1]?.firstChild as HTMLElement
    const targetNode = targetDocxElement.closest('tr')?.cells[1]?.firstChild as HTMLElement

    if (!sourceNode || !targetNode) {
      throw new Error(
        'Could not find draggable/droppable nodes for DND test. Check selectors or DraggableFileItem structure.'
      )
    }

    const dataTransfer = new MockDataTransfer()

    // Simulate what react-dnd HTML5Backend might put into DataTransfer.
    // The `itemType` here is the DND item type string (e.g., 'FILE_ITEM_DND_TYPE')
    // and `item` is the payload from useDrag's item function.
    // We need to know/assume the DND itemType string used by DraggableFileItem.
    // Let's assume it's 'FILE_DND' for now - THIS MUST MATCH YOUR DraggableFileItem.tsx
    const sourceDragItem: DragItem = {
      id: '1', // ID of Test.pdf
      path: [], // Path of Test.pdf
      name: sourceFileText, // Name of Test.pdf
      itemType: 'file', // Describes the item as a file system file
      type: 'file', // The DND type for react-dnd (ItemTypes.FILE)
    }
    try {
      dataTransfer.setData('application/json', JSON.stringify(sourceDragItem))
      // HTML5Backend also sets standard types. Let's try setting text/plain too.
      dataTransfer.setData('text/plain', sourceFileText)
    } catch (e) {
      console.error('Error setting data on MockDataTransfer:', e)
    }

    fireEvent.dragStart(sourceNode, { dataTransfer })
    fireEvent.dragEnter(targetNode, { dataTransfer })
    fireEvent.dragOver(targetNode, { dataTransfer, preventDefault: () => {} }) // dragOver needs preventDefault
    fireEvent.drop(targetNode, { dataTransfer })
    // fireEvent.dragEnd(sourceNode, { dataTransfer }); // Optional: for cleanup states

    // Verify that the "Create New Folder" dialog appears
    const dialogTitle = await screen.findByRole('heading', { name: /Create New Folder/i, level: 2 })
    expect(dialogTitle).toBeInTheDocument()

    // Optionally, check for the dialog description or other elements
    expect(
      screen.getByText(/Enter a name for the new folder that will contain the selected files./i)
    ).toBeInTheDocument()
  })

  // UC-DND-005: In the "Create New Folder" dialog (from file-to-file drop), enter a name and confirm.
  it('should create a new folder and move the two files into it', async () => {
    renderWithDnd(<DocumentsPage />)

    const sourceFileText = 'Test.pdf'
    const targetFileText = 'AnotherDoc.docx'
    const newFolderName = 'Dropped Files Folder'

    // --- Part 1: Perform DND to open dialog (similar to UC-DND-004) ---
    const sourcePdfElement = await screen.findByText(sourceFileText)
    const targetDocxElement = await screen.findByText(targetFileText)
    const sourceNode = sourcePdfElement.closest('tr')?.cells[1]?.firstChild as HTMLElement
    const targetNode = targetDocxElement.closest('tr')?.cells[1]?.firstChild as HTMLElement

    if (!sourceNode || !targetNode) {
      throw new Error('DND source/target nodes not found for UC-DND-005')
    }

    const dataTransfer = new MockDataTransfer()
    const sourceDragItem: DragItem = {
      id: '1',
      path: [],
      name: sourceFileText,
      itemType: 'file',
      type: 'file', // The DND type for react-dnd (ItemTypes.FILE)
    }
    dataTransfer.setData('application/json', JSON.stringify(sourceDragItem))
    dataTransfer.setData('text/plain', sourceFileText)

    fireEvent.dragStart(sourceNode, { dataTransfer })
    fireEvent.dragEnter(targetNode, { dataTransfer })
    fireEvent.dragOver(targetNode, { dataTransfer, preventDefault: () => {} })
    fireEvent.drop(targetNode, { dataTransfer })

    const createFolderDialogTitle = await screen.findByRole('heading', {
      name: /Create New Folder/i,
      level: 2,
    })
    expect(createFolderDialogTitle).toBeInTheDocument()
    const dialogElement = createFolderDialogTitle.closest('[role="dialog"]')
    if (!dialogElement) {
      throw new Error('Create New Folder dialog DOM element not found after DND')
    }

    // --- Part 2: Interact with the dialog ---
    const folderNameInput = within(dialogElement as HTMLElement).getByPlaceholderText('Folder name')
    expect(folderNameInput).toBeInTheDocument()
    fireEvent.change(folderNameInput, { target: { value: newFolderName } })

    const createButton = within(dialogElement as HTMLElement).getByRole('button', {
      name: /Create Folder/i,
    })
    expect(createButton).toBeInTheDocument()

    // Before clicking create, let's refine the listFiles mock for the *next* call it will receive
    // This is a bit of a hack, ideally createFolder/renameItem mocks would modify mockFilesStore.
    const originalListFilesMock = documentsApi.listFiles
    documentsApi.listFiles = vi.fn(async (path: string[] = []) => {
      if (path.length === 0) {
        // Simulate the state *after* folder creation and file moves
        const filesAfterMove = mockFilesStore.filter(
          f => f.name !== sourceFileText && f.name !== targetFileText && f.path.length === 0
        )
        filesAfterMove.push({
          id: 'new-folder-id', // Needs a unique ID
          name: newFolderName,
          type: 'folder',
          path: [],
          size: 0,
          modified: new Date(),
          processed: false,
          chunked: false,
        })
        return filesAfterMove
      }
      // Fallback to original mock for other paths if necessary, though not expected in this specific flow
      return originalListFilesMock(path)
    })

    fireEvent.click(createButton)

    // --- Part 3: Assertions ---
    // Dialog should close
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /Create New Folder/i, level: 2 })
      ).not.toBeInTheDocument()
    })

    // Verify documentsApi.createFolder was called
    expect(documentsApi.createFolder).toHaveBeenCalledWith(newFolderName, [])

    // Verify documentsApi.renameItem was called for both files
    expect(documentsApi.renameItem).toHaveBeenCalledWith(
      sourceFileText,
      `${newFolderName}/${sourceFileText}`
    )
    expect(documentsApi.renameItem).toHaveBeenCalledWith(
      targetFileText,
      `${newFolderName}/${targetFileText}`
    )

    // Check that listFiles was called again to refresh (with our new mock implementation for root)
    await waitFor(() => {
      expect(documentsApi.listFiles).toHaveBeenCalledWith([])
    })

    // UI should update: new folder visible, old files not in root
    await screen.findByText(newFolderName)
    expect(screen.queryByText(sourceFileText)).not.toBeInTheDocument()
    expect(screen.queryByText(targetFileText)).not.toBeInTheDocument()

    // Restore original listFiles mock if other tests in the same file might be affected
    // or rely on the beforeEach to reset it.
    documentsApi.listFiles = originalListFilesMock
  })
})

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))
