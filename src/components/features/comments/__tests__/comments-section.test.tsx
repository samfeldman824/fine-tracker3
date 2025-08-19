import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommentsSection } from '../comments-section';
import { getCommentsHierarchy } from '@/lib/api/comments';
import { createClient } from '@/lib/supabase/client';
import type { CommentsResponse } from '@/types/models';

// Mock the API functions
jest.mock('@/lib/api/comments', () => ({
    getCommentsHierarchy: jest.fn()
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
    createClient: jest.fn()
}));

// Mock child components
jest.mock('../comment-input', () => ({
    CommentInput: ({ onSubmit, placeholder, className }: {
        onSubmit?: (data: { content: string }) => void;
        placeholder?: string;
        className?: string;
    }) => (
        <div data-testid="comment-input" className={className}>
            <input placeholder={placeholder} />
            <button onClick={() => onSubmit?.({ content: 'Test comment' })}>
                Submit
            </button>
        </div>
    )
}));

jest.mock('../comment-thread', () => ({
    CommentThread: ({ comment, onReply, onEdit, onDelete }: {
        comment: { id: string; content: string; author: { name: string } };
        onReply?: (parentId: string, content: string) => void;
        onEdit?: (commentId: string) => void;
        onDelete?: (commentId: string) => void;
    }) => (
        <div data-testid={`comment-thread-${comment.id}`}>
            <span>{comment.content}</span>
            <span>{comment.author.name}</span>
            {onReply && (
                <button onClick={() => onReply(comment.id, 'Test reply')}>
                    Reply
                </button>
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

describe('CommentsSection', () => {
    const mockGetCommentsHierarchy = getCommentsHierarchy as jest.MockedFunction<typeof getCommentsHierarchy>;
    const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

    const mockSupabaseClient = {
        from: jest.fn(() => ({
            insert: jest.fn(() => ({
                select: jest.fn(() => ({
                    single: jest.fn()
                }))
            }))
        }))
    };

    const mockCommentsResponse: CommentsResponse = {
        comments: [
            {
                id: '1',
                fine_id: 'fine-1',
                author_id: 'user-1',
                parent_comment_id: null,
                content: 'First comment',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                is_deleted: false,
                author: {
                    user_id: 'user-1',
                    username: 'testuser',
                    name: 'Test User'
                },
                replies: [],
                reply_count: 0
            },
            {
                id: '2',
                fine_id: 'fine-1',
                author_id: 'user-2',
                parent_comment_id: null,
                content: 'Second comment',
                created_at: '2024-01-01T01:00:00Z',
                updated_at: '2024-01-01T01:00:00Z',
                is_deleted: false,
                author: {
                    user_id: 'user-2',
                    username: 'testuser2',
                    name: 'Test User 2'
                },
                replies: [],
                reply_count: 0
            }
        ],
        total_count: 2
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateClient.mockReturnValue(mockSupabaseClient as any);
    });

    it('shows loading state initially', () => {
        mockGetCommentsHierarchy.mockImplementation(() => new Promise(() => {})); // Never resolves

        render(<CommentsSection fineId="fine-1" />);

        expect(screen.getByText('Loading comments...')).toBeInTheDocument();
        // Check for the loading spinner by looking for the Loader2 component
        expect(screen.getByText('Loading comments...').previousElementSibling).toBeInTheDocument();
    });

    it('displays comments when loaded successfully', async () => {
        mockGetCommentsHierarchy.mockResolvedValue({
            data: mockCommentsResponse,
            error: null
        });

        render(<CommentsSection fineId="fine-1" />);

        await waitFor(() => {
            expect(screen.getByText('Comments')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument(); // Comment count
            expect(screen.getByTestId('comment-thread-1')).toBeInTheDocument();
            expect(screen.getByTestId('comment-thread-2')).toBeInTheDocument();
            expect(screen.getByText('First comment')).toBeInTheDocument();
            expect(screen.getByText('Second comment')).toBeInTheDocument();
        });
    });

    it('displays empty state when no comments exist', async () => {
        mockGetCommentsHierarchy.mockResolvedValue({
            data: { comments: [], total_count: 0 },
            error: null
        });

        render(<CommentsSection fineId="fine-1" />);

        await waitFor(() => {
            expect(screen.getByText('No comments yet')).toBeInTheDocument();
            expect(screen.getByText('Be the first to share your thoughts on this fine.')).toBeInTheDocument();
        });
    });

    it('displays error state when loading fails', async () => {
        mockGetCommentsHierarchy.mockResolvedValue({
            data: null,
            error: 'Failed to fetch comments'
        });

        render(<CommentsSection fineId="fine-1" />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load comments')).toBeInTheDocument();
            expect(screen.getByText('Failed to fetch comments')).toBeInTheDocument();
            expect(screen.getByText('Try Again')).toBeInTheDocument();
        });
    });

    it('retries loading comments when retry button is clicked', async () => {
        mockGetCommentsHierarchy
            .mockResolvedValueOnce({
                data: null,
                error: 'Network error'
            })
            .mockResolvedValueOnce({
                data: mockCommentsResponse,
                error: null
            });

        render(<CommentsSection fineId="fine-1" />);

        // Wait for error state
        await waitFor(() => {
            expect(screen.getByText('Failed to load comments')).toBeInTheDocument();
        });

        // Click retry
        fireEvent.click(screen.getByText('Try Again'));

        // Should show loading then success
        await waitFor(() => {
            expect(screen.getByText('Comments')).toBeInTheDocument();
            expect(screen.getByTestId('comment-thread-1')).toBeInTheDocument();
        });

        expect(mockGetCommentsHierarchy).toHaveBeenCalledTimes(2);
    });

    it('includes comment input for new comments', async () => {
        mockGetCommentsHierarchy.mockResolvedValue({
            data: { comments: [], total_count: 0 },
            error: null
        });

        render(<CommentsSection fineId="fine-1" />);

        await waitFor(() => {
            expect(screen.getByTestId('comment-input')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
        });
    });

    it('submits new comment and refreshes list', async () => {
        const mockInsert = jest.fn(() => ({
            select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                    data: { id: '3', content: 'New comment' },
                    error: null
                })
            }))
        }));

        mockSupabaseClient.from.mockReturnValue({
            insert: mockInsert
        });

        mockGetCommentsHierarchy
            .mockResolvedValueOnce({
                data: { comments: [], total_count: 0 },
                error: null
            })
            .mockResolvedValueOnce({
                data: mockCommentsResponse,
                error: null
            });

        render(<CommentsSection fineId="fine-1" />);

        await waitFor(() => {
            expect(screen.getByTestId('comment-input')).toBeInTheDocument();
        });

        // Submit comment
        fireEvent.click(screen.getByText('Submit'));

        await waitFor(() => {
            expect(mockInsert).toHaveBeenCalled();
            expect(mockGetCommentsHierarchy).toHaveBeenCalledTimes(2); // Initial load + refresh
        });
    });

    it('handles reply submission', async () => {
        mockGetCommentsHierarchy.mockResolvedValue({
            data: mockCommentsResponse,
            error: null
        });

        const mockInsert = jest.fn().mockResolvedValue({
            data: { id: '3' },
            error: null
        });

        mockSupabaseClient.from.mockReturnValue({
            insert: mockInsert
        });

        render(<CommentsSection fineId="fine-1" currentUserId="user-1" />);

        await waitFor(() => {
            expect(screen.getByTestId('comment-thread-1')).toBeInTheDocument();
        });

        // Click reply on first comment
        fireEvent.click(screen.getAllByText('Reply')[0]);

        await waitFor(() => {
            expect(mockInsert).toHaveBeenCalledWith({
                content: 'Test reply',
                fine_id: 'fine-1',
                author_id: 'user-1',
                parent_comment_id: '1'
            });
        });
    });

    it('handles edit and delete actions', async () => {
        mockGetCommentsHierarchy.mockResolvedValue({
            data: mockCommentsResponse,
            error: null
        });

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        render(<CommentsSection fineId="fine-1" currentUserId="user-1" canEdit={true} />);

        await waitFor(() => {
            expect(screen.getByTestId('comment-thread-1')).toBeInTheDocument();
        });

        // Test edit
        fireEvent.click(screen.getAllByText('Edit')[0]);
        expect(consoleSpy).toHaveBeenCalledWith('Edit comment:', '1');

        // Test delete - delete button should be clickable
        const deleteButtons = screen.getAllByText('Delete');
        expect(deleteButtons.length).toBeGreaterThan(0);
        fireEvent.click(deleteButtons[0]);
        // The delete functionality is tested in detail in comment-item-delete.test.tsx

        consoleSpy.mockRestore();
    });

    it('refetches comments when fineId changes', async () => {
        mockGetCommentsHierarchy.mockResolvedValue({
            data: mockCommentsResponse,
            error: null
        });

        const { rerender } = render(<CommentsSection fineId="fine-1" />);

        await waitFor(() => {
            expect(mockGetCommentsHierarchy).toHaveBeenCalledWith('fine-1');
        });

        // Change fineId
        rerender(<CommentsSection fineId="fine-2" />);

        await waitFor(() => {
            expect(mockGetCommentsHierarchy).toHaveBeenCalledWith('fine-2');
        });

        expect(mockGetCommentsHierarchy).toHaveBeenCalledTimes(2);
    });

    it('applies custom className', async () => {
        mockGetCommentsHierarchy.mockResolvedValue({
            data: { comments: [], total_count: 0 },
            error: null
        });

        const { container } = render(
            <CommentsSection fineId="fine-1" className="custom-class" />
        );

        await waitFor(() => {
            expect(container.querySelector('.comments-section')).toHaveClass('custom-class');
        });
    });

    it('shows comment count in header when comments exist', async () => {
        mockGetCommentsHierarchy.mockResolvedValue({
            data: mockCommentsResponse,
            error: null
        });

        render(<CommentsSection fineId="fine-1" />);

        await waitFor(() => {
            expect(screen.getByText('Comments')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument();
        });
    });

    it('does not show comment count when no comments exist', async () => {
        mockGetCommentsHierarchy.mockResolvedValue({
            data: { comments: [], total_count: 0 },
            error: null
        });

        render(<CommentsSection fineId="fine-1" />);

        await waitFor(() => {
            expect(screen.getByText('Comments')).toBeInTheDocument();
            expect(screen.queryByText('0')).not.toBeInTheDocument();
        });
    });
});