import React from 'react';
import { render, RenderOptions, act } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Custom render function with DnD provider
export const renderWithDnd = (ui: React.ReactElement, options?: RenderOptions) => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <DndProvider backend={HTML5Backend}>{children}</DndProvider>
    );

    return render(ui, { wrapper: Wrapper, ...options });
};

// Custom render function with HTML5 DnD
export const renderWithHtml5Dnd = (ui: React.ReactElement, options?: RenderOptions) => {
    return renderWithDnd(ui, options);
};

// Helper function to wait for async updates
export const waitForAsyncUpdates = async () => {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
};

// Helper to wrap interactions in act
export const actAsync = async (fn: () => Promise<void> | void) => {
    await act(async () => {
        await fn();
    });
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event'; 