import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/input';
import '@testing-library/jest-dom';

describe('Input Component', () => {
    it('renders correctly with a placeholder', () => {
        render(<Input placeholder="Enter text here" />);
        expect(screen.getByPlaceholderText('Enter text here')).toBeInTheDocument();
    });

    it('allows text input', () => {
        render(<Input placeholder="Enter text" />);
        const inputElement = screen.getByPlaceholderText('Enter text') as HTMLInputElement;
        fireEvent.change(inputElement, { target: { value: 'Hello World' } });
        expect(inputElement.value).toBe('Hello World');
    });

    it('can be disabled', () => {
        render(<Input placeholder="Disabled input" disabled />);
        const inputElement = screen.getByPlaceholderText('Disabled input');
        expect(inputElement).toBeDisabled();
    });

    it('renders with a specific type', () => {
        render(<Input type="password" placeholder="Password" />);
        const inputElement = screen.getByPlaceholderText('Password');
        expect(inputElement).toHaveAttribute('type', 'password');
    });
}); 