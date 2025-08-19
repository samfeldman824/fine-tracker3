import { render, screen, fireEvent } from '@testing-library/react';
import { CommentItem } from '../comment-item';
import type { CommentWithAuthor } from '@/types/models';

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

const mockEditedComment: CommentWithAuthor = {
    ...mockComment,
    id: 'comment-2',
    content: 'This comment was edited',
    updated_at: '2025-08-18T11:00:00Z' // Different from created_at
};

describe('CommentItem', () => {
    it('renders comment content and author information', () => {
        render(<CommentItem comment={mockComment} />);

        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('This is a test comment')).toBeInTheDocument();
        expect(screen.getByText('TU')).toBeInTheDocument(); // Avatar initials
    });

    it('shows relative timestamp', () => {
        // Create a comment that's 2 hours old
        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
        
        const recentComment = {
            ...mockComment,
            created_at: twoHoursAgo.toISOString()
        };

        render(<CommentItem comment={recentComment} />);

        expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });

    it('shows edited indicator for modified comments', () => {
        render(<CommentItem comment={mockEditedComment} />);

        expect(screen.getByText('(edited)')).toBeInTheDocument();
    });

    it('does not show edited indicator for unmodified comments', () => {
        render(<CommentItem comment={mockComment} />);

        expect(screen.queryByText('(edited)')).not.toBeInTheDocument();
    });

    it('shows action buttons on hover', () => {
        const onReply = jest.fn();
        const onEdit = jest.fn();
        const onDelete = jest.fn();

        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        );

        const commentDiv = screen.getByText('This is a test comment').closest('.group');
        expect(commentDiv).toBeInTheDocument();

        // Initially actions should be hidden
        const replyButton = screen.getByRole('button', { name: /reply/i });
        expect(replyButton.closest('div')).toHaveClass('opacity-0');

        // Hover to show actions
        fireEvent.mouseEnter(commentDiv!);
        expect(replyButton.closest('div')).toHaveClass('opacity-100');
    });

    it('calls onReply when reply button is clicked', () => {
        const onReply = jest.fn();

        render(
            <CommentItem
                comment={mockComment}
                onReply={onReply}
            />
        );

        const replyButton = screen.getByRole('button', { name: /reply/i });
        fireEvent.click(replyButton);

        expect(onReply).toHaveBeenCalledWith('comment-1');
    });

    it('shows edit and delete buttons only for comment owner', () => {
        const onEdit = jest.fn();
        const onDelete = jest.fn();

        // Render as comment owner
        const { rerender } = render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        );

        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();

        // Render as different user
        rerender(
            <CommentItem
                comment={mockComment}
                currentUserId="user-2"
                canEdit={true}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        );

        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('does not show edit/delete buttons when canEdit is false', () => {
        const onEdit = jest.fn();
        const onDelete = jest.fn();

        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={false}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        );

        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('calls onEdit when edit button is clicked', () => {
        const onEdit = jest.fn();

        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={onEdit}
            />
        );

        const editButton = screen.getByRole('button', { name: /edit/i });
        fireEvent.click(editButton);

        expect(onEdit).toHaveBeenCalledWith('comment-1');
    });

    it('calls onDelete when delete button is clicked', () => {
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

        expect(onDelete).toHaveBeenCalledWith('comment-1');
    });

    it('does not show reply button for deleted comments', () => {
        const deletedComment = { ...mockComment, is_deleted: true };
        const onReply = jest.fn();

        render(
            <CommentItem
                comment={deletedComment}
                onReply={onReply}
            />
        );

        expect(screen.queryByRole('button', { name: /reply/i })).not.toBeInTheDocument();
    });

    it('does not show edit/delete buttons for deleted comments', () => {
        const deletedComment = { ...mockComment, is_deleted: true };
        const onEdit = jest.fn();
        const onDelete = jest.fn();

        render(
            <CommentItem
                comment={deletedComment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        );

        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('generates consistent avatar colors for the same name', () => {
        const { rerender } = render(<CommentItem comment={mockComment} />);
        
        const avatar1 = screen.getByText('TU');
        const colorClass1 = avatar1.className;

        rerender(<CommentItem comment={mockComment} />);
        
        const avatar2 = screen.getByText('TU');
        const colorClass2 = avatar2.className;

        expect(colorClass1).toBe(colorClass2);
    });

    it('handles multi-word names for avatar generation', () => {
        const commentWithLongName = {
            ...mockComment,
            author: {
                ...mockComment.author,
                name: 'John Michael Smith'
            }
        };

        render(<CommentItem comment={commentWithLongName} />);

        expect(screen.getByText('JMS')).toBeInTheDocument();
    });

    it('formats relative time correctly for different durations', () => {
        const now = new Date();
        
        const testCases = [
            { offsetSeconds: -30, expected: 'just now' },
            { offsetSeconds: -90, expected: '1 minute ago' },
            { offsetSeconds: -300, expected: '5 minutes ago' },
            { offsetSeconds: -3900, expected: '1 hour ago' },
            { offsetSeconds: -7200, expected: '2 hours ago' },
            { offsetSeconds: -90000, expected: '1 day ago' },
            { offsetSeconds: -180000, expected: '2 days ago' }
        ];

        testCases.forEach(({ offsetSeconds, expected }) => {
            const commentTime = new Date(now.getTime() + offsetSeconds * 1000);
            const testComment = {
                ...mockComment,
                created_at: commentTime.toISOString()
            };

            const { unmount } = render(<CommentItem comment={testComment} />);

            expect(screen.getByText(expected)).toBeInTheDocument();

            unmount();
        });
    });
});