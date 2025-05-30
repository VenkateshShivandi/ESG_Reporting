import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Textarea } from '@/components/ui/textarea';
import '@testing-library/jest-dom';

describe('Textarea Component', () => {
    it('renders correctly with a placeholder', () => {
        render(<Textarea placeholder="Enter your text here" />);
        expect(screen.getByPlaceholderText('Enter your text here')).toBeInTheDocument();
    });

    it('allows text input and calls onChange', () => {
        const handleChange = vi.fn();
        render(<Textarea placeholder="Enter text" onChange={handleChange} />);

        const textareaElement = screen.getByPlaceholderText('Enter text') as HTMLTextAreaElement;
        fireEvent.change(textareaElement, { target: { value: 'This is a test message.' } });

        expect(textareaElement.value).toBe('This is a test message.');
        expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('can be disabled', () => {
        render(<Textarea placeholder="Disabled textarea" disabled />);
        const textareaElement = screen.getByPlaceholderText('Disabled textarea');
        expect(textareaElement).toBeDisabled();
    });

    it('displays a default value if provided', () => {
        render(<Textarea defaultValue="Initial text" />);
        const textareaElement = screen.getByDisplayValue('Initial text') as HTMLTextAreaElement;
        expect(textareaElement).toBeInTheDocument();
    });
}); 