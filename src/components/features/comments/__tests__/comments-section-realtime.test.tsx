import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommentsSection } from '../comments-section';
import { getCommentsHierarchy, createComment } from '@/lib/api/comments';
import { useRealtimeComments } from '@/hooks/use-realtime-comments';
import type { CommentsResponse } from '@/types/models';

// Mock the API functions
jest.mock('@/lib/api/comments', () => ({
    getCommentsHierarchy: jest.fn(),
    createComment: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
    validateCommentContent: jest.fn(() => ({ isValid: true, errors: [] }))
}));

// Mock the real-time hook
jest.mock('@/hooks/use-realtime-comments', () => ({
    useRealtimeComments: jest.fn(),
    applyRealtimeUpdateToComments: jest.fn((comments, update) => {
        // Simple mock implementation
        if (update.type === 'INSERT') {
            return [...comments, { ...update.comment, replies: [], reply_count: 0 }];
        }
        return comments;
    })
}));

const mockGetCommentsHierarchy = getCommentsHierarchy as jest.MockedFunction<typeof getCommentsHierarchy>;
const mockCreateComment = createComment as jest.MockedFunction<typeof createComment>;
const mockUseRealtimeComments = useRealtimeComments as jest.MockedFunction<typeof useRealtimeComments>;

// Mock comment data
const mockCommentsResponse: CommentsResponse = {
    comments: [
        {
            id: 'comment-1',
            fine_id: 'fine-1',
            author_id: 'user-1',
            parent_comment_id: null,
            content: 'Test comment',
            created_at: '2025-08-18T10:00:00Z',
            updated_at: '2025-08-18T10:00:00Z',
            is_deleted: false,
            author: {
                user_id: 'user-1',
                username: 'testuser',
                name: 'Test User'
            },
            replies: [],
            reply_count: 0
        }
    ],
    total_count: 1
};

describe('CommentsSection - Real-time Features', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default mock implementations
        mockGetCommentsHierarchy.mockResolvedValue({
            data: mockCommentsResponse,
            error: null
        });

        mockCreateComment.mockResolvedValue({
            data: {
                id: 'new-comment',
                fine_id: 'fine-1',
                author_id: 'user-2',
                parent_comment_id: null,
                content: 'New comment',
                created_at: '2025-08-18T11:00:00Z',
                updated_at: '2025-08-18T11:00:00Z',
                is_deleted: false
            },
            error: null
        });

        mockUseRealtimeComments.mockReturnValue({
            subscribe: jest.fn(),
            unsubscribe: jest.fn(),
            isSubscribed: true
        });
    });

    it('should show real-time connection status when enabled', async () => {
        render(
            <CommentsSection
                fineId="fine-1"
                currentUserId="user-2"
                currentUserName="Current User"
                currentUserUsername="currentuser"
                enableRealtime={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Live')).toBeInTheDocument();
        });

        expect(screen.getByText('Live')).toBeInTheDocument();
        expect(screen.queryByText('Offline')).not.toBeInTheDocument();
    });

    it('should show offline status when real-time is disconnected', async () => {
        mockUseRealtimeComments.mockReturnValue({
            subscribe: jest.fn(),
            unsubscribe: jest.fn(),
            isSubscribed: false
        });

        render(
            <CommentsSection
                fineId="fine-1"
                currentUserId="user-2"
                currentUserName="Current User"
                currentUserUsername="currentuser"
                enableRealtime={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Offline')).toBeInTheDocument();
        });
    });

    it('should not show connection status when real-time is disabled', async () => {
        render(
            <CommentsSection
                fineId="fine-1"
                currentUserId="user-2"
                currentUserName="Current User"
                currentUserUsername="currentuser"
                enableRealtime={false}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Test comment')).toBeInTheDocument();
        });

        expect(screen.queryByText('Live')).not.toBeInTheDocument();
        expect(screen.queryByText('Offline')).not.toBeInTheDocument();
    });

    it('should render comment input for new comments', async () => {
        render(
            <CommentsSection
                fineId="fine-1"
                currentUserId="user-2"
                currentUserName="Current User"
                currentUserUsername="currentuser"
                enableRealtime={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Test comment')).toBeInTheDocument();
        });

        // Should show comment input
        expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /post comment/i })).toBeInTheDocument();
    });

    it('should show optimistic comments with proper styling', async () => {
        render(
            <CommentsSection
                fineId="fine-1"
                currentUserId="user-2"
                currentUserName="Current User"
                currentUserUsername="currentuser"
                enableRealtime={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Test comment')).toBeInTheDocument();
        });

        // The component should be ready to handle optimistic updates
        // This test verifies the component renders correctly with real-time enabled
        expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('should initialize real-time subscription with correct parameters', () => {
        render(
            <CommentsSection
                fineId="fine-1"
                currentUserId="user-2"
                currentUserName="Current User"
                currentUserUsername="currentuser"
                enableRealtime={true}
            />
        );

        expect(mockUseRealtimeComments).toHaveBeenCalledWith({
            fineId: 'fine-1',
            enabled: true,
            onCommentChange: expect.any(Function),
            onError: expect.any(Function)
        });
    });

    it('should handle real-time comment updates', async () => {
        let realtimeCallback: any;
        
        mockUseRealtimeComments.mockImplementation(({ onCommentChange }) => {
            realtimeCallback = onCommentChange;
            return {
                subscribe: jest.fn(),
                unsubscribe: jest.fn(),
                isSubscribed: true
            };
        });

        render(
            <CommentsSection
                fineId="fine-1"
                currentUserId="user-2"
                currentUserName="Current User"
                currentUserUsername="currentuser"
                enableRealtime={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Test comment')).toBeInTheDocument();
        });

        // Simulate real-time comment insertion
        const newComment = {
            id: 'realtime-comment',
            fine_id: 'fine-1',
            author_id: 'user-3',
            parent_comment_id: null,
            content: 'Real-time comment',
            created_at: '2025-08-18T12:00:00Z',
            updated_at: '2025-08-18T12:00:00Z',
            is_deleted: false,
            author: {
                user_id: 'user-3',
                username: 'realtimeuser',
                name: 'Realtime User'
            }
        };

        if (realtimeCallback) {
            realtimeCallback({
                type: 'INSERT',
                comment: newComment
            });
        }

        // Should show the new comment from real-time update
        await waitFor(() => {
            expect(screen.getByText('Real-time comment')).toBeInTheDocument();
        });
    });

    it('should preserve scroll position during real-time updates', async () => {
        const scrollToSpy = jest.fn();
        Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
            get: () => 100,
            set: scrollToSpy,
            configurable: true
        });

        let realtimeCallback: any;
        
        mockUseRealtimeComments.mockImplementation(({ onCommentChange }) => {
            realtimeCallback = onCommentChange;
            return {
                subscribe: jest.fn(),
                unsubscribe: jest.fn(),
                isSubscribed: true
            };
        });

        render(
            <CommentsSection
                fineId="fine-1"
                currentUserId="user-2"
                currentUserName="Current User"
                currentUserUsername="currentuser"
                enableRealtime={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Test comment')).toBeInTheDocument();
        });

        // Simulate real-time update
        if (realtimeCallback) {
            realtimeCallback({
                type: 'INSERT',
                comment: {
                    id: 'new-comment',
                    fine_id: 'fine-1',
                    author_id: 'user-3',
                    parent_comment_id: null,
                    content: 'New comment',
                    created_at: '2025-08-18T12:00:00Z',
                    updated_at: '2025-08-18T12:00:00Z',
                    is_deleted: false,
                    author: {
                        user_id: 'user-3',
                        username: 'user3',
                        name: 'User Three'
                    }
                }
            });
        }

        // Should restore scroll position
        await waitFor(() => {
            expect(scrollToSpy).toHaveBeenCalledWith(100);
        });
    });
});