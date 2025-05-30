import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import '@testing-library/jest-dom';

describe('Dialog Component', () => {
    it('renders dialog content when trigger is clicked', () => {
        render(
            <Dialog>
                <DialogTrigger asChild>
                    <Button>Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Test Dialog Title</DialogTitle>
                        <DialogDescription>This is a test dialog description.</DialogDescription>
                    </DialogHeader>
                    <p>Dialog body content.</p>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                        <Button>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );

        expect(screen.queryByText('Test Dialog Title')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('Open Dialog'));

        expect(screen.getByText('Test Dialog Title')).toBeInTheDocument();
        expect(screen.getByText('This is a test dialog description.')).toBeInTheDocument();
        expect(screen.getByText('Dialog body content.')).toBeInTheDocument();
        expect(screen.getByText('Close', { selector: 'button' })).toBeInTheDocument();
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('closes the dialog when DialogClose button is clicked', () => {
        render(
            <Dialog defaultOpen={true}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Test Dialog</DialogTitle>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button>Close Me</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );

        expect(screen.getByText('Test Dialog')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Close Me'));
        expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
    });
}); 