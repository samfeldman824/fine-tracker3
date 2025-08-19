import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteCommentDialog } from '../delete-comment-dialog';

describe('DeleteCommentDialog', () => {
    const defaultProps = {
        isOpen: true,
        onClose: jest.fn(),
        onConfirm: jest.fn(),
        isDeleting: false,
        hasReplies: false,
        commentAuthor: 'Test User'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('does not render when isOpen is false', () => {
        render(
            <DeleteCommentDialog
                {...defaultProps}
                isOpen={false}
            />
        );

        expect(screen.queryByText('Delete Comment')).not.toBeInTheDocument();
    });

    it('renders dialog when isOpen is true', () => {
        render(<DeleteCommentDialog {...defaultProps} />);

        expect(screen.getByRole('heading', { name: 'Delete Comment' })).toBeInTheDocument();
        expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
        expect(screen.getByText("Are you sure you want to delete Test User's comment?")).toBeInTheDocument();
    });

    it('shows warning for comments with replies', () => {
        render(
            <DeleteCommentDialog
                {...defaultProps}
                hasReplies={true}
            />
        );

        expect(screen.getByText('This comment has replies')).toBeInTheDocument();
        expect(screen.getByText(/The comment will be replaced with a "deleted comment" placeholder/)).toBeInTheDocument();
    });

    it('does not show replies warning for comments without replies', () => {
        render(
            <DeleteCommentDialog
                {...defaultProps}
                hasReplies={false}
            />
        );

        expect(screen.queryByText('This comment has replies')).not.toBeInTheDocument();
    });

    it('calls onClose when cancel button is clicked', () => {
        const onClose = jest.fn();
        render(
            <DeleteCommentDialog
                {...defaultProps}
                onClose={onClose}
            />
        );

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm when delete button is clicked', () => {
        const onConfirm = jest.fn();
        render(
            <DeleteCommentDialog
                {...defaultProps}
                onConfirm={onConfirm}
            />
        );

        const deleteButton = screen.getByRole('button', { name: /delete comment/i });
        fireEvent.click(deleteButton);

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('disables buttons when isDeleting is true', () => {
        render(
            <DeleteCommentDialog
                {...defaultProps}
                isDeleting={true}
            />
        );

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        const deleteButton = screen.getByRole('button', { name: /deleting/i });

        expect(cancelButton).toBeDisabled();
        expect(deleteButton).toBeDisabled();
    });

    it('shows loading state when isDeleting is true', () => {
        render(
            <DeleteCommentDialog
                {...defaultProps}
                isDeleting={true}
            />
        );

        expect(screen.getByText('Deleting...')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Delete Comment' })).toBeInTheDocument(); // Header still shows
    });

    it('uses default commentAuthor when not provided', () => {
        render(
            <DeleteCommentDialog
                {...defaultProps}
                commentAuthor={undefined}
            />
        );

        expect(screen.getByText("Are you sure you want to delete this user's comment?")).toBeInTheDocument();
    });

    it('handles custom commentAuthor', () => {
        render(
            <DeleteCommentDialog
                {...defaultProps}
                commentAuthor="John Doe"
            />
        );

        expect(screen.getByText("Are you sure you want to delete John Doe's comment?")).toBeInTheDocument();
    });

    it('renders with proper ARIA attributes for accessibility', () => {
        render(<DeleteCommentDialog {...defaultProps} />);

        // Check that the dialog has proper structure
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('aria-labelledby', 'delete-dialog-title');
        expect(dialog).toHaveAttribute('aria-describedby', 'delete-dialog-description');
    });

    it('prevents interaction with background when open', () => {
        render(<DeleteCommentDialog {...defaultProps} />);

        // Check that overlay exists
        const overlay = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
        expect(overlay).toBeInTheDocument();
    });
});