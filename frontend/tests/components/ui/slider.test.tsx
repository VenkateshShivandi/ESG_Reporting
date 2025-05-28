import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Slider } from '@/components/ui/slider';
import '@testing-library/jest-dom';

// Mock ResizeObserver because JSDOM doesn't implement it
if (typeof window !== 'undefined') {
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    }));
}

describe('Slider Component', () => {
    it('renders correctly with default props', () => {
        render(<Slider defaultValue={[50]} max={100} step={1} />);
        const slider = screen.getByRole('slider');
        expect(slider).toBeInTheDocument();
        expect(slider).toHaveAttribute('aria-valuenow', '50');
    });

    it('calls onValueChange when interacted with (ArrowRight)', () => {
        const handleValueChange = vi.fn();
        // Initial value is 25, step is 1. ArrowRight should increase it to 26.
        render(<Slider defaultValue={[25]} max={100} step={1} onValueChange={handleValueChange} />);
        const sliderThumb = screen.getByRole('slider');

        fireEvent.keyDown(sliderThumb, { key: 'ArrowRight' });
        expect(handleValueChange).toHaveBeenCalledTimes(1);
        expect(handleValueChange).toHaveBeenCalledWith([26]);
    });

    it('can be disabled', () => {
        const { container } = render(<Slider defaultValue={[50]} max={100} step={1} disabled />);
        // The Slider root element should have aria-disabled="true".
        expect(container.firstChild).toHaveAttribute('aria-disabled', 'true');
    });

    it('renders with specific min, max values', () => {
        render(<Slider defaultValue={[10]} min={5} max={20} step={1} />);
        const slider = screen.getByRole('slider');
        expect(slider).toHaveAttribute('aria-valuemin', '5');
        expect(slider).toHaveAttribute('aria-valuemax', '20');
        expect(slider).toHaveAttribute('aria-valuenow', '10');
    });
}); 