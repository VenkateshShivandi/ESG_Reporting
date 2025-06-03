import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { InteractiveWorkspace } from '@/components/dashboard/interactive-workspace';
import '@testing-library/jest-dom';

describe('InteractiveWorkspace Component', () => {
    const mockReport = {
        id: 'report-123',
        name: 'Sample ESG Report',
        type: 'GRI',
        timestamp: new Date(),
        files: ['file1.pdf'],
        content: 'Report content details.',
        metrics: { environmental_score: 80, social_score: 75, governance_score: 90 },
        generated_at: new Date().toISOString(),
        status: 'completed'
    };
    const mockOnClose = vi.fn();

    beforeEach(() => {
        mockOnClose.mockClear();
    });

    it('renders the report type in the header and the main content', async () => {
        const { container } = render(<InteractiveWorkspace report={mockReport} onClose={mockOnClose} />);

        expect(screen.getByRole('heading', { name: /GRI Report/i })).toBeInTheDocument();

        const editorDiv = container.querySelector('div[contenteditable="true"]');
        expect(editorDiv).toBeInTheDocument();

        const contentParagraph = await screen.findByText('Report content details.', {
            selector: '.prose p',
        });
        expect(contentParagraph).toBeInTheDocument();
    });

    it('calls onClose when the close button is clicked', () => {
        render(<InteractiveWorkspace report={mockReport} onClose={mockOnClose} />);
        // Try to find the close button by its aria-label, assuming it was re-added to the component
        const closeButton = screen.getByLabelText('Close', { selector: 'button' });
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
}); 