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

describe('DocumentsPage - Rename', () => {
  it('should rename a file successfully', async () => {
    renderWithDnd(<DocumentsPage />);
    
    const fileRow = await screen.findByRole('row', { name: /Report\.pdf/i });
    const menuButton = within(fileRow).getByRole('button', { name: /more actions/i });
    fireEvent.click(menuButton);
    
    fireEvent.click(await screen.findByText(/rename/i));
    
    const renameInput = await screen.findByRole('textbox');
    fireEvent.change(renameInput, { target: { value: 'Annual Report.pdf' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    
    await waitFor(() => {
      expect(documentsApi.renameItem).toHaveBeenCalledWith(
        'Report.pdf',
        'Annual Report.pdf'
      );
    });
  });

  it('should validate filename format', async () => {
    // Test invalid characters, empty names, etc.
  });

  it('should handle rename conflicts', async () => {
    documentsApi.renameItem = vi.fn().mockRejectedValue({ message: 'File exists' });
    // ... attempt rename ...
    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });
}); 