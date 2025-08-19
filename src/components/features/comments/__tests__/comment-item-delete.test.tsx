import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommentItem } from '../comment-item';
import { deleteComment } from '@/lib/api/comments';
import type { CommentWithAuthor } from '@/types/models';

// Mock the API
jest.mock('@/lib/api/comments', () => ({
    deleteComment: jest.fn(),
    validateCommentContent: jest.fn(() => ({ isValid: true, errors: [] })),
    updateComment: jest.fn()
}));

const mockDeleteComment = deleteComment as jest.MockedFunction<typeof deleteComment>;

// Mock comment data
const mockComment: CommentWithAuthor = {
    id: 'comment-1',
    fine_id: 'fine-1',
    author_id: 'user-1',
    parent_comment_id: null,
    content: 'This is a test comment',
    created_at: '2025-08-18T10:00:00Z',
    updated_at: '2025-08-18T10:00:00Z',
    is_deleted: false,
    author: {
        user_id: 'user-1',
        username: 'testuser',
        name: 'Test User'
    }
};

const mockDeletedComment: CommentWithAuthor = {
    ...mockComment,
    is_deleted: true,
    content: ''
};

describe('CommentItem - Delete Functionality', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows delete button for comment owner when canEdit is true', () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
            />
        );

        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('does not show delete button for non-owner', () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-2"
                canEdit={true}
            />
        );

        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('does not show delete button when canEdit is false', () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={false}
            />
        );

        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('does not show delete button for deleted comments', () => {
        render(
            <CommentItem
                comment={mockDeletedComment}
                currentUserId="user-1"
                canEdit={true}
            />
        );

        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('opens delete confirmation dialog when delete button is clicked', () => {
        const onDelete = jest.fn();
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onDelete={onDelete}
            />
        );

        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);

        expect(screen.getByRole('heading', { name: 'Delete Comment' })).toBeInTheDocument();
        expect(screen.getByText("Are you sure you want to delete Test User's comment?")).toBeInTheDocument();
        expect(onDelete).toHaveBeenCalledWith('comment-1');
    });

    it('shows replies warning in delete dialog when comment has replies', () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                hasReplies={true}
            />
        );

        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);

        expect(screen.getByText('This comment has replies')).toBeInTheDocument();
    });

    it('does not show replies warning when comment has no replies', () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                hasReplies={false}
            />
        );

        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);

        expect(screen.queryByText('This comment has replies')).not.toBeInTheDocument();
    });

    it('closes delete dialog when cancel is clicked', () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
            />
        );

        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);

        expect(screen.getByRole('heading', { name: 'Delete Comment' })).toBeInTheDocument();

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);

        expect(screen.queryByRole('heading', { name: 'Delete Comment' })).not.toBeInTheDocument();
    });

    it('calls deleteComment API and onCommentDeleted when deletion is confirmed', async () => {
        mockDeleteComment.mockResolvedValue({ data: mockDeletedComment, error: null });
        const onCommentDeleted = jest.fn();

        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onCommentDeleted={onCommentDeleted}
            />
        );

        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);

        const confirmButton = screen.getByRole('button', { name: /delete comment/i });
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(mockDeleteComment).toHaveBeenCalledWith('comment-1');
            expect(onCommentDeleted).toHaveBeenCalledWith('comment-1');
        });

        expect(screen.queryByText('Delete Comment')).not.toBeInTheDocument();
    });

    it('shows loading state during deletion', async () => {
        mockDeleteComment.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
            />
        );

        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);

        const confirmButton = screen.getByRole('button', { name: /delete comment/i });
        fireEvent.click(confirmButton);

        expect(screen.getByText('Deleting...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('handles deletion error gracefully', async () => {
        mockDeleteComment.mockResolvedValue({ data: null, error: 'Failed to delete comment' });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
            />
        );

        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);

        const confirmButton = screen.getByRole('button', { name: /delete comment/i });
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Failed to delete comment:', 'Failed to delete comment');
        });

        // Dialog should remain open on error
        expect(screen.getByRole('heading', { name: 'Delete Comment' })).toBeInTheDocument();

        consoleSpy.mockRestore();
    });

    it('renders deleted comment placeholder correctly', () => {
        render(
            <CommentItem
                comment={mockDeletedComment}
                currentUserId="user-1"
                canEdit={true}
            />
        );

        expect(screen.getByText('Deleted User')).toBeInTheDocument();
        expect(screen.getByText('This comment has been deleted')).toBeInTheDocument();
        expect(screen.getByText('?')).toBeInTheDocument(); // Deleted avatar
        expect(screen.queryByText('Test User')).not.toBeInTheDocument();
        expect(screen.queryByText('This is a test comment')).not.toBeInTheDocument();
    });

    it('does not show action buttons for deleted comments', () => {
        render(
            <CommentItem
                comment={mockDeletedComment}
                currentUserId="user-1"
                canEdit={true}
                onReply={jest.fn()}
            />
        );

        expect(screen.queryByRole('button', { name: /reply/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('shows relative timestamp for deleted comments', () => {
        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
        
        const deletedCommentWithTime = {
            ...mockDeletedComment,
            created_at: twoHoursAgo.toISOString()
        };

        render(
            <CommentItem
                comment={deletedCommentWithTime}
                currentUserId="user-1"
                canEdit={true}
            />
        );

        expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });

    it('applies correct styling to deleted comment placeholder', () => {
        render(
            <CommentItem
                comment={mockDeletedComment}
                currentUserId="user-1"
                canEdit={true}
            />
        );

        const deletedUserText = screen.getByText('Deleted User');
        const deletedContentText = screen.getByText('This comment has been deleted');
        const avatarElement = screen.getByText('?');

        expect(deletedUserText).toHaveClass('text-gray-500');
        expect(deletedContentText).toHaveClass('text-gray-500', 'italic');
        expect(avatarElement).toHaveClass('bg-gray-300', 'text-gray-500');
    });
});