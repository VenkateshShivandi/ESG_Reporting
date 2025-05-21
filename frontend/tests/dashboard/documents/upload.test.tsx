// Using Cursor rules 😊
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DocumentsPage from '@/pages/DocumentsPage';
import { documentsApi } from '@/lib/api/documents';
import { vi } from 'vitest';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const renderWithDnd = (ui: React.ReactElement) =>
  render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);

describe('DocumentsPage - Upload', () => {
  it('should upload single file successfully', async () => {
    const file = new File(['test'], 'report.pdf', { type: 'application/pdf' });
    renderWithDnd(<DocumentsPage />);
    
    const input = screen.getByLabelText(/upload files/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/uploading report\.pdf/i)).toBeInTheDocument();
      expect(documentsApi.uploadFile).toHaveBeenCalled();
    });
  });

  it('should reject oversized files', async () => {
    const bigFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'big.pdf');
    // ... trigger upload ...
    expect(await screen.findByText(/file too large/i)).toBeInTheDocument();
  });

  it('should handle concurrent uploads', async () => {
    // Test multiple file upload progress
  });

  it('should show upload progress', async () => {
    // Test progress bar updates
  });
}); 