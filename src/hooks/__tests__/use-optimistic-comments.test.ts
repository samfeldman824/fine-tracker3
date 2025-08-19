import { renderHook, act } from '@testing-library/react';
import { useOptimisticComments } from '../use-optimistic-comments';
import type { CommentWithReplies, CommentInsert } from '@/types/models';

// Mock comment data
const mockComment: CommentWithReplies = {
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
};

const mockAuthor = {
    user_id: 'user-2',
    username: 'newuser',
    name: 'New User'
};

describe('useOptimisticComments', () => {
    it('should initialize with provided comments', () => {
        const { result } = renderHook(() => useOptimisticComments({
            initialComments: [mockComment]
        }));

        expect(result.current.comments).toHaveLength(1);
        expect(result.current.comments[0].id).toBe('comment-1');
    });

    it('should add optimistic comment immediately', () => {
        const { result } = renderHook(() => useOptimisticComments({
            initialComments: [mockComment]
        }));

        const newCommentData: CommentInsert = {
            content: 'New optimistic comment',
            fine_id: 'fine-1',
            author_id: 'user-2'
        };

        act(() => {
            result.current.addOptimisticComment(newCommentData, 'temp-1', mockAuthor);
        });

        expect(result.current.comments).toHaveLength(2);
        const optimisticComment = result.current.comments.find(c => c.id === 'temp-1');
        expect(optimisticComment).toBeDefined();
        expect(optimisticComment?.isOptimistic).toBe(true);
        expect(optimisticComment?.content).toBe('New optimistic comment');
    });

    it('should update optimistic comment', () => {
        const { result } = renderHook(() => useOptimisticComments({
            initialComments: [mockComment]
        }));

        act(() => {
            result.current.updateOptimisticComment('comment-1', {
                content: 'Updated content'
            }, 'update-1');
        });

        const updatedComment = result.current.comments.find(c => c.id === 'comment-1');
        expect(updatedComment?.content).toBe('Updated content');
        expect(updatedComment?.isOptimistic).toBe(true);
        expect(updatedComment?.optimisticId).toBe('update-1');
    });

    it('should delete optimistic comment without replies', () => {
        const { result } = renderHook(() => useOptimisticComments({
            initialComments: [mockComment]
        }));

        act(() => {
            result.current.deleteOptimisticComment('comment-1', 'delete-1');
        });

        expect(result.current.comments).toHaveLength(0);
    });

    it('should soft delete optimistic comment with replies', () => {
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

        const { result } = renderHook(() => useOptimisticComments({
            initialComments: [commentWithReplies]
        }));

        act(() => {
            result.current.deleteOptimisticComment('comment-1', 'delete-1');
        });

        expect(result.current.comments).toHaveLength(1);
        const deletedComment = result.current.comments[0];
        expect(deletedComment.is_deleted).toBe(true);
        expect(deletedComment.replies).toHaveLength(1);
    });

    it('should confirm optimistic update', () => {
        const { result } = renderHook(() => useOptimisticComments({
            initialComments: [mockComment]
        }));

        const newCommentData: CommentInsert = {
            content: 'New comment',
            fine_id: 'fine-1',
            author_id: 'user-2'
        };

        act(() => {
            result.current.addOptimisticComment(newCommentData, 'temp-1', mockAuthor);
        });

        const actualComment = {
            id: 'actual-1',
            fine_id: 'fine-1',
            author_id: 'user-2',
            parent_comment_id: null,
            content: 'New comment',
            created_at: '2025-08-18T10:30:00Z',
            updated_at: '2025-08-18T10:30:00Z',
            is_deleted: false,
            author: mockAuthor
        };

        act(() => {
            result.current.confirmOptimisticUpdate('temp-1', actualComment);
        });

        const confirmedComment = result.current.comments.find(c => c.id === 'actual-1');
        expect(confirmedComment).toBeDefined();
        expect(confirmedComment?.isOptimistic).toBe(false);
        expect(confirmedComment?.optimisticId).toBeUndefined();
    });

    it('should reject optimistic update and show error', () => {
        const onError = jest.fn();
        const { result } = renderHook(() => useOptimisticComments({
            initialComments: [mockComment],
            onError
        }));

        const newCommentData: CommentInsert = {
            content: 'Failed comment',
            fine_id: 'fine-1',
            author_id: 'user-2'
        };

        act(() => {
            result.current.addOptimisticComment(newCommentData, 'temp-1', mockAuthor);
        });

        act(() => {
            result.current.rejectOptimisticUpdate('temp-1', 'Network error');
        });

        const errorComment = result.current.comments.find(c => c.id === 'temp-1');
        expect(errorComment?.error).toBe('Network error');
        expect(errorComment?.isOptimistic).toBe(true);
        expect(onError).toHaveBeenCalledWith(new Error('Network error'), 'temp-1');
    });

    it('should clear all optimistic updates', () => {
        const { result } = renderHook(() => useOptimisticComments({
            initialComments: [mockComment]
        }));

        const newCommentData: CommentInsert = {
            content: 'Optimistic comment',
            fine_id: 'fine-1',
            author_id: 'user-2'
        };

        act(() => {
            result.current.addOptimisticComment(newCommentData, 'temp-1', mockAuthor);
            result.current.updateOptimisticComment('comment-1', {
                content: 'Updated'
            }, 'update-1');
        });

        expect(result.current.comments).toHaveLength(2);

        act(() => {
            result.current.clearOptimisticUpdates();
        });

        expect(result.current.comments).toHaveLength(1);
        expect(result.current.comments[0].id).toBe('comment-1');
        expect(result.current.comments[0].isOptimistic).toBeFalsy();
    });

    it('should set comments from external source', () => {
        const { result } = renderHook(() => useOptimisticComments({
            initialComments: [mockComment]
        }));

        const newComments: CommentWithReplies[] = [
            {
                ...mockComment,
                id: 'comment-2',
                content: 'External comment'
            }
        ];

        act(() => {
            result.current.setComments(newComments);
        });

        expect(result.current.comments).toHaveLength(1);
        expect(result.current.comments[0].id).toBe('comment-2');
        expect(result.current.comments[0].content).toBe('External comment');
    });
});