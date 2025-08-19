import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommentThread } from '../comment-thread';
import type { CommentWithReplies } from '@/types/models';

// Mock the child components
jest.mock('../comment-item', () => ({
    CommentItem: ({ comment, onReply, onEdit, onDelete }: {
        comment: { id: string; content: string; author: { name: string } };
        onReply?: (id: string) => void;
        onEdit?: (id: string) => void;
        onDelete?: (id: string) => void;
    }) => (
        <div data-testid={`comment-item-${comment.id}`}>
            <span>{comment.content}</span>
            <span>{comment.author.name}</span>
            {onReply && (
                <button onClick={() => onReply(comment.id)}>Reply</button>
            )}
            {onEdit && (
                <button onClick={() => onEdit(comment.id)}>Edit</button>
            )}
            {onDelete && (
                <button onClick={() => onDelete(comment.id)}>Delete</button>
            )}
        </div>
    )
}));

jest.mock('../comment-input', () => ({
    CommentInput: ({ onSubmit, onCancel, placeholder }: {
        onSubmit?: (data: { content: string }) => void;
        onCancel?: () => void;
        placeholder?: string;
    }) => (
        <div data-testid="comment-input">
            <input placeholder={placeholder} />
            <button onClick={() => onSubmit?.({ content: 'Test reply' })}>Submit</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    )
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, ...props }: {
        children: React.ReactNode;
        onClick?: () => void;
        [key: string]: unknown;
    }) => (
        <button onClick={onClick} {...props}>
            {children}
        </button>
    )
}));

describe('CommentThread', () => {
    const mockUser = {
        user_id: 'user-1',
        username: 'testuser',
        name: 'Test User'
    };

    const createMockComment = (id: string, content: string, replies: CommentWithReplies[] = []): CommentWithReplies => ({
        id,
        fine_id: 'fine-1',
        author_id: 'user-1',
        parent_comment_id: null,
        content,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_deleted: false,
        author: mockUser,
        replies,
        reply_count: replies.length
    });

    const mockOnReply = jest.fn();
    const mockOnEdit = jest.fn();
    const mockOnDelete = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders a single comment without replies', () => {
        const comment = createMockComment('1', 'Test comment');

        render(
            <CommentThread
                comment={comment}
                currentUserId="user-1"
                onReply={mockOnReply}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />
        );

        expect(screen.getByTestId('comment-item-1')).toBeInTheDocument();
        expect(screen.getByText('Test comment')).toBeInTheDocument();
        expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('renders nested replies with proper indentation', () => {
        const reply1 = createMockComment('2', 'First reply');
        const reply2 = createMockComment('3', 'Second reply');
        const comment = createMockComment('1', 'Parent comment', [reply1, reply2]);

        render(
            <CommentThread
                comment={comment}
                depth={0}
                currentUserId="user-1"
                onReply={mockOnReply}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />
        );

        expect(screen.getByTestId('comment-item-1')).toBeInTheDocument();
        expect(screen.getByTestId('comment-item-2')).toBeInTheDocument();
        expect(screen.getByTestId('comment-item-3')).toBeInTheDocument();
        expect(screen.getByText('Parent comment')).toBeInTheDocument();
        expect(screen.getByText('First reply')).toBeInTheDocument();
        expect(screen.getByText('Second reply')).toBeInTheDocument();
    });

    it('shows reply input when reply button is clicked', async () => {
        const comment = createMockComment('1', 'Test comment');

        render(
            <CommentThread
                comment={comment}
                currentUserId="user-1"
                onReply={mockOnReply}
            />
        );

        // Click reply button
        fireEvent.click(screen.getByText('Reply'));

        // Reply input should appear
        await waitFor(() => {
            expect(screen.getByTestId('comment-input')).toBeInTheDocument();
        });

        // Should have correct placeholder
        expect(screen.getByPlaceholderText('Reply to Test User...')).toBeInTheDocument();
    });

    it('hides reply input when cancel is clicked', async () => {
        const comment = createMockComment('1', 'Test comment');

        render(
            <CommentThread
                comment={comment}
                currentUserId="user-1"
                onReply={mockOnReply}
            />
        );

        // Click reply button
        fireEvent.click(screen.getByText('Reply'));

        // Reply input should appear
        await waitFor(() => {
            expect(screen.getByTestId('comment-input')).toBeInTheDocument();
        });

        // Click cancel
        fireEvent.click(screen.getByText('Cancel'));

        // Reply input should disappear
        await waitFor(() => {
            expect(screen.queryByTestId('comment-input')).not.toBeInTheDocument();
        });
    });

    it('calls onReply with correct parameters when reply is submitted', async () => {
        const comment = createMockComment('1', 'Test comment');

        render(
            <CommentThread
                comment={comment}
                currentUserId="user-1"
                onReply={mockOnReply}
            />
        );

        // Click reply button
        fireEvent.click(screen.getByText('Reply'));

        // Submit reply
        await waitFor(() => {
            fireEvent.click(screen.getByText('Submit'));
        });

        expect(mockOnReply).toHaveBeenCalledWith('1', 'Test reply');
    });

    it('shows collapse/expand toggle for deeply nested comments', () => {
        const reply = createMockComment('2', 'Deep reply');
        const comment = createMockComment('1', 'Parent comment', [reply]);

        render(
            <CommentThread
                comment={comment}
                depth={3} // Deep enough to show toggle
                currentUserId="user-1"
                onReply={mockOnReply}
            />
        );

        expect(screen.getByText('Hide replies')).toBeInTheDocument();
    });

    it('collapses and expands replies when toggle is clicked', async () => {
        const reply = createMockComment('2', 'Deep reply');
        const comment = createMockComment('1', 'Parent comment', [reply]);

        render(
            <CommentThread
                comment={comment}
                depth={3}
                currentUserId="user-1"
                onReply={mockOnReply}
            />
        );

        // Initially expanded - reply should be visible
        expect(screen.getByTestId('comment-item-2')).toBeInTheDocument();
        expect(screen.getByText('Hide replies')).toBeInTheDocument();

        // Click to collapse
        fireEvent.click(screen.getByText('Hide replies'));

        // Reply should be hidden, toggle should show expand
        await waitFor(() => {
            expect(screen.queryByTestId('comment-item-2')).not.toBeInTheDocument();
            expect(screen.getByText('1 reply')).toBeInTheDocument();
        });

        // Click to expand again
        fireEvent.click(screen.getByText('1 reply'));

        // Reply should be visible again
        await waitFor(() => {
            expect(screen.getByTestId('comment-item-2')).toBeInTheDocument();
            expect(screen.getByText('Hide replies')).toBeInTheDocument();
        });
    });

    it('shows "Continue thread" link when max depth is reached', () => {
        const reply = createMockComment('2', 'Deep reply');
        const comment = createMockComment('1', 'Parent comment', [reply]);

        render(
            <CommentThread
                comment={comment}
                depth={10} // At max depth
                maxDepth={10}
                currentUserId="user-1"
                onReply={mockOnReply}
            />
        );

        expect(screen.getByText('Continue thread (1 more reply)')).toBeInTheDocument();
        expect(screen.queryByTestId('comment-item-2')).not.toBeInTheDocument();
    });

    it('applies correct visual indentation based on depth', () => {
        const comment = createMockComment('1', 'Test comment');

        const { container } = render(
            <CommentThread
                comment={comment}
                depth={3}
                currentUserId="user-1"
            />
        );

        const threadElement = container.querySelector('.comment-thread');
        expect(threadElement).toHaveStyle('margin-left: 60px'); // 3 * 20px
    });

    it('caps visual indentation at maximum depth', () => {
        const comment = createMockComment('1', 'Test comment');

        const { container } = render(
            <CommentThread
                comment={comment}
                depth={10} // Beyond max visual depth
                currentUserId="user-1"
            />
        );

        const threadElement = container.querySelector('.comment-thread');
        expect(threadElement).toHaveStyle('margin-left: 120px'); // 6 * 20px (capped)
    });

    it('handles multiple nested levels correctly', () => {
        const deepReply = createMockComment('3', 'Deep reply');
        const reply = createMockComment('2', 'First reply', [deepReply]);
        const comment = createMockComment('1', 'Parent comment', [reply]);

        render(
            <CommentThread
                comment={comment}
                depth={0}
                currentUserId="user-1"
                onReply={mockOnReply}
            />
        );

        expect(screen.getByTestId('comment-item-1')).toBeInTheDocument();
        expect(screen.getByTestId('comment-item-2')).toBeInTheDocument();
        expect(screen.getByTestId('comment-item-3')).toBeInTheDocument();
    });

    it('passes through edit and delete handlers correctly', () => {
        const comment = createMockComment('1', 'Test comment');

        render(
            <CommentThread
                comment={comment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />
        );

        fireEvent.click(screen.getByText('Edit'));
        expect(mockOnEdit).toHaveBeenCalledWith('1');

        fireEvent.click(screen.getByText('Delete'));
        expect(mockOnDelete).toHaveBeenCalledWith('1');
    });
});