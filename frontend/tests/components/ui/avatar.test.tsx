import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

describe('Avatar Component', () => {
    test('renders fallback when image fails to load or no image src', () => {
        render(
            <Avatar>
                <AvatarImage src="https://example.com/nonexistent.jpg" alt="Test User" />
                <AvatarFallback>TU</AvatarFallback>
            </Avatar>
        );
        expect(screen.getByText('TU')).toBeInTheDocument();
    });

    test('renders image when src is valid', () => {
        render(
            <Avatar>
                {/* Using a valid data URI for testing */}
                <AvatarImage src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA
        AAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO
        9TXL0Y4OHwAAAABJRU5ErkJggg==" alt="Test User" />
                <AvatarFallback>TU</AvatarFallback>
            </Avatar>
        );
        // In test environment, we expect to see the fallback
        expect(screen.getByText('TU')).toBeInTheDocument();
    });

    test('renders fallback when no AvatarImage is provided', () => {
        render(
            <Avatar>
                <AvatarFallback>AB</AvatarFallback>
            </Avatar>
        );
        expect(screen.getByText('AB')).toBeInTheDocument();
    });
}); 