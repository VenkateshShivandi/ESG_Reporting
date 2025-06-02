import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
    test('renders correctly with children', () => {
        render(<Button>Click Me</Button>);
        expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    test('applies variant prop', () => {
        render(<Button variant="outline">Outline Button</Button>);
        expect(screen.getByText('Outline Button')).toHaveClass('border'); // Example check for outline variant
    });

    test('can be disabled', () => {
        render(<Button disabled>Disabled Button</Button>);
        expect(screen.getByText('Disabled Button')).toBeDisabled();
    });
}); 