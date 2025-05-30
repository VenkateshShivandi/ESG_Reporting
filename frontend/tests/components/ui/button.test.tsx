import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import '@testing-library/jest-dom';

describe('Button Component', () => {
    it('renders correctly with children', () => {
        render(<Button>Click Me</Button>);
        expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('applies variant prop', () => {
        render(<Button variant="outline">Outline Button</Button>);
        expect(screen.getByText('Outline Button')).toHaveClass('border'); // Example check for outline variant
    });

    it('can be disabled', () => {
        render(<Button disabled>Disabled Button</Button>);
        expect(screen.getByText('Disabled Button')).toBeDisabled();
    });
}); 