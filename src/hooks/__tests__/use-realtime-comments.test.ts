import { renderHook, act } from '@testing-library/react';
import { useRealtimeComments, applyRealtimeUpdateToComments } from '../use-realtime-comments';
import { createClient } from '@/lib/supabase/client';
import type { CommentWithAuthor, CommentWithReplies } from '@/types/models';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
    createClient: jest.fn()
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Mock comment data
const mockComment: CommentWithAuthor = {
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
    }
};

const mockCommentWithReplies: CommentWithReplies = {
    ...mockComment,
    replies: [],
    reply_count: 0
};

describe('useRealtimeComments', () => {
    let mockChannel: any;
    let mockSupabase: any;

    beforeEach(() => {
        mockChannel = {
            on: jest.fn().mockReturnThis(),
            subscribe: jest.fn().mockImplementation((callback) => {
                callback('SUBSCRIBED');
                return mockChannel;
            })
        };

        mockSupabase = {
            channel: jest.fn().mockReturnValue(mockChannel),
            removeChannel: jest.fn(),
            from: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: mockComment.author,
                            error: null
                        })
                    })
                })
            })
        };

        mockCreateClient.mockReturnValue(mockSupabase);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should subscribe to real-time changes when enabled', () => {
        const onCommentChange = jest.fn();
        const fineId = 'fine-1';

        renderHook(() => useRealtimeComments({
            fineId,
            onCommentChange,
            enabled: true
        }));

        expect(mockSupabase.channel).toHaveBeenCalledWith(`comments:fine_id=eq.${fineId}`);
        expect(mockChannel.on).toHaveBeenCalledWith(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'comments',
                filter: `fine_id=eq.${fineId}`
            },
            expect.any(Function)
        );
        expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should not subscribe when disabled', () => {
        const onCommentChange = jest.fn();
        const fineId = 'fine-1';

        renderHook(() => useRealtimeComments({
            fineId,
            onCommentChange,
            enabled: false
        }));

        expect(mockSupabase.channel).not.toHaveBeenCalled();
    });

    it('should unsubscribe on unmount', () => {
        const onCommentChange = jest.fn();
        const fineId = 'fine-1';

        const { unmount } = renderHook(() => useRealtimeComments({
            fineId,
            onCommentChange,
            enabled: true
        }));

        unmount();

        expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('should handle subscription errors', () => {
        const onError = jest.fn();
        const fineId = 'fine-1';

        mockChannel.subscribe.mockImplementation((callback) => {
            callback('CHANNEL_ERROR');
            return mockChannel;
        });

        renderHook(() => useRealtimeComments({
            fineId,
            onError,
            enabled: true
        }));

        expect(onError).toHaveBeenCalledWith(new Error('Failed to subscribe to real-time comments'));
    });
});

describe('applyRealtimeUpdateToComments', () => {
    const mockComments: CommentWithReplies[] = [mockCommentWithReplies];

    it('should add new comment on INSERT', () => {
        const newComment: CommentWithAuthor = {
            ...mockComment,
            id: 'comment-2',
            content: 'New comment'
        };

        const update = {
            type: 'INSERT' as const,
            comment: newComment
        };

        const result = applyRealtimeUpdateToComments(mockComments, update);

        expect(result).toHaveLength(2);
        expect(result.find(c => c.id === 'comment-2')).toBeDefined();
    });

    it('should update existing comment on UPDATE', () => {
        const updatedComment: CommentWithAuthor = {
            ...mockComment,
            content: 'Updated content',
            updated_at: '2025-08-18T11:00:00Z'
        };

        const update = {
            type: 'UPDATE' as const,
            comment: updatedComment
        };

        const result = applyRealtimeUpdateToComments(mockComments, update);

        expect(result).toHaveLength(1);
        expect(result[0].content).toBe('Updated content');
        expect(result[0].updated_at).toBe('2025-08-18T11:00:00Z');
    });

    it('should handle soft delete on DELETE', () => {
        const deletedComment: CommentWithAuthor = {
            ...mockComment,
            is_deleted: true,
            content: ''
        };

        const update = {
            type: 'DELETE' as const,
            comment: deletedComment
        };

        const result = applyRealtimeUpdateToComments(mockComments, update);

        // Comment should be removed if no replies
        expect(result).toHaveLength(0);
    });

    it('should preserve deleted comment with replies', () => {
        const commentWithReplies: CommentWithReplies = {
            ...mockComment,
            replies: [{
                ...mockComment,
                id: 'reply-1',
                parent_comment_id: 'comment-1',
                replies: [],
                reply_count: 0
            }],
            reply_count: 1
        };

        const deletedComment: CommentWithAuthor = {
            ...mockComment,
            is_deleted: true,
            content: ''
        };

        const update = {
            type: 'DELETE' as const,
            comment: deletedComment
        };

        const result = applyRealtimeUpdateToComments([commentWithReplies], update);

        // Comment should be preserved but marked as deleted
        expect(result).toHaveLength(1);
        expect(result[0].is_deleted).toBe(true);
        expect(result[0].replies).toHaveLength(1);
    });
});