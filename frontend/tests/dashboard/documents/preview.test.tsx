// Using Cursor rules 😊
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DocumentsPage from '@/pages/DocumentsPage';
import { documentsApi } from '@/lib/api/documents';
import { vi } from 'vitest';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const renderWithDnd = (ui: React.ReactElement) =>
  render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);

describe('DocumentsPage - File Preview', () => {
  it('should open preview for supported file types', async () => {
    renderWithDnd(<DocumentsPage />);
    
    const fileRow = await screen.findByRole('row', { name: /Report\.pdf/i });
    const previewButton = within(fileRow).getByRole('button', { name: /preview/i });
    fireEvent.click(previewButton);
    
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/preview of report\.pdf/i)).toBeInTheDocument();
  });

  it('should handle unsupported file types', async () => {
    // Test for .zip or other unsupported types
  });

  it('should show loading state during preview generation', async () => {
    // Test loading spinner
  });

  it('should handle preview errors', async () => {
    documentsApi.getDownloadUrl = vi.fn().mockRejectedValue(new Error('Preview failed'));
    // ... open preview ...
    expect(await screen.findByText(/preview unavailable/i)).toBeInTheDocument();
  });
}); 