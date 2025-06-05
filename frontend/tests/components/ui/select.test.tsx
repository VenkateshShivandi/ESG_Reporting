import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import '@testing-library/jest-dom';

// Mock scrollIntoView because JSDOM doesn't implement it
if (typeof window !== 'undefined') {
    Element.prototype.scrollIntoView = vi.fn();
}

describe('Select Component', () => {
    const options = [
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana' },
        { value: 'cherry', label: 'Cherry' },
    ];

    it('renders with a placeholder and opens options on click', async () => {
        render(
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Select a fruit" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );

        expect(screen.getByText('Select a fruit')).toBeInTheDocument();
        options.forEach(option => {
            expect(screen.queryByText(option.label)).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('combobox'));

        for (const option of options) {
            expect(await screen.findByText(option.label)).toBeInTheDocument();
        }
    });

    it('allows selecting an option and calls onValueChange', async () => {
        const handleValueChange = vi.fn();
        render(
            <Select onValueChange={handleValueChange}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a fruit" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );

        fireEvent.click(screen.getByRole('combobox'));

        const bananaOption = await screen.findByText('Banana');
        fireEvent.click(bananaOption);

        expect(handleValueChange).toHaveBeenCalledWith('banana');
        expect(await screen.findByText('Banana')).toBeInTheDocument();
        expect(screen.queryByText('Select a fruit')).not.toBeInTheDocument();
    });

    it('can have a default value', () => {
        render(
            <Select defaultValue="cherry">
                <SelectTrigger>
                    <SelectValue placeholder="Select a fruit" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
        expect(screen.getByText('Cherry')).toBeInTheDocument();
    });
}); 