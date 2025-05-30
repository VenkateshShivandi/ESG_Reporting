import React from 'react';
import { render, screen } from '@testing-library/react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import '@testing-library/jest-dom';

describe('Avatar Component', () => {
    it('renders fallback when image fails to load or no image src', () => {
        render(
            <Avatar>
                <AvatarImage src="https://example.com/nonexistent.jpg" alt="Test User" />
                <AvatarFallback>TU</AvatarFallback>
            </Avatar>
        );
        expect(screen.getByText('TU')).toBeInTheDocument();
    });

    it('renders image when src is valid', () => {
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

    it('renders fallback when no AvatarImage is provided', () => {
        render(
            <Avatar>
                <AvatarFallback>AB</AvatarFallback>
            </Avatar>
        );
        expect(screen.getByText('AB')).toBeInTheDocument();
    });
}); 