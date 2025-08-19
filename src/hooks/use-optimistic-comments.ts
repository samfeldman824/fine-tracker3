"use client"

import { useState, useCallback, useRef } from "react";
import type { CommentWithReplies, CommentWithAuthor, CommentInsert, CommentUpdate } from "@/types/models";
import { buildCommentHierarchy } from "@/lib/api/comments";

export interface OptimisticComment extends CommentWithAuthor {
    isOptimistic?: boolean;
    optimisticId?: string;
    error?: string;
}

export interface OptimisticCommentWithReplies extends CommentWithReplies {
    isOptimistic?: boolean;
    optimisticId?: string;
    error?: string;
    replies: OptimisticCommentWithReplies[];
}

export interface UseOptimisticCommentsOptions {
    initialComments: CommentWithReplies[];
    onError?: (error: Error, optimisticId?: string) => void;
}

export interface UseOptimisticCommentsReturn {
    comments: OptimisticCommentWithReplies[];
    setComments: (comments: CommentWithReplies[]) => void;
    addOptimisticComment: (comment: CommentInsert, tempId: string, author: { user_id: string; username: string; name: string }) => void;
    updateOptimisticComment: (commentId: string, update: Partial<CommentUpdate>, tempId?: string) => void;
    deleteOptimisticComment: (commentId: string, tempId?: string) => void;
    confirmOptimisticUpdate: (optimisticId: string, actualComment?: CommentWithAuthor) => void;
    rejectOptimisticUpdate: (optimisticId: string, error: string) => void;
    clearOptimisticUpdates: () => void;
}

/**
 * Custom hook for managing optimistic comment updates
 * Provides immediate UI feedback while API calls are in progress
 */
export function useOptimisticComments({
    initialComments,
    onError
}: UseOptimisticCommentsOptions): UseOptimisticCommentsReturn {
    const [comments, setCommentsState] = useState<OptimisticCommentWithReplies[]>(
        initialComments.map(convertToOptimistic)
    );
    const optimisticUpdatesRef = useRef<Map<string, OptimisticComment>>(new Map());

    // Convert regular comment to optimistic comment
    function convertToOptimistic(comment: CommentWithReplies): OptimisticCommentWithReplies {
        return {
            ...comment,
            replies: comment.replies.map(convertToOptimistic)
        };
    }

    // Set comments from external source (e.g., real-time updates)
    const setComments = useCallback((newComments: CommentWithReplies[]) => {
        setCommentsState(newComments.map(convertToOptimistic));
    }, []);

    // Add optimistic comment for immediate UI feedback
    const addOptimisticComment = useCallback((
        commentData: CommentInsert,
        tempId: string,
        author: { user_id: string; username: string; name: string }
    ) => {
        const optimisticComment: OptimisticComment = {
            id: tempId,
            fine_id: commentData.fine_id,
            author_id: commentData.author_id,
            parent_comment_id: commentData.parent_comment_id || null,
            content: commentData.content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
            author,
            isOptimistic: true,
            optimisticId: tempId
        };

        // Store the optimistic update
        optimisticUpdatesRef.current.set(tempId, optimisticComment);

        setCommentsState(prevComments => {
            // Add to flat list and rebuild hierarchy
            const flatComments = flattenOptimisticHierarchy(prevComments);
            flatComments.push(optimisticComment);
            return buildOptimisticHierarchy(flatComments);
        });
    }, []);

    // Update optimistic comment
    const updateOptimisticComment = useCallback((
        commentId: string,
        update: Partial<CommentUpdate>,
        tempId?: string
    ) => {
        const optimisticId = tempId || `update-${commentId}-${Date.now()}`;

        setCommentsState(prevComments => {
            const updateCommentInTree = (commentList: OptimisticCommentWithReplies[]): OptimisticCommentWithReplies[] => {
                return commentList.map(comment => {
                    if (comment.id === commentId) {
                        const updatedComment = {
                            ...comment,
                            ...update,
                            updated_at: new Date().toISOString(),
                            isOptimistic: true,
                            optimisticId
                        };

                        // Store the optimistic update
                        optimisticUpdatesRef.current.set(optimisticId, {
                            ...updatedComment,
                            replies: undefined,
                            reply_count: undefined
                        } as OptimisticComment);

                        return updatedComment;
                    }
                    if (comment.replies.length > 0) {
                        return {
                            ...comment,
                            replies: updateCommentInTree(comment.replies)
                        };
                    }
                    return comment;
                });
            };
            return updateCommentInTree(prevComments);
        });
    }, []);

    // Delete optimistic comment
    const deleteOptimisticComment = useCallback((
        commentId: string,
        tempId?: string
    ) => {
        const optimisticId = tempId || `delete-${commentId}-${Date.now()}`;

        setCommentsState(prevComments => {
            const updateCommentInTree = (commentList: OptimisticCommentWithReplies[]): OptimisticCommentWithReplies[] => {
                return commentList.map(comment => {
                    if (comment.id === commentId) {
                        if (comment.replies.length > 0) {
                            // Mark as deleted but keep for replies
                            const deletedComment = {
                                ...comment,
                                is_deleted: true,
                                content: '',
                                isOptimistic: true,
                                optimisticId
                            };

                            // Store the optimistic update
                            optimisticUpdatesRef.current.set(optimisticId, {
                                ...deletedComment,
                                replies: undefined,
                                reply_count: undefined
                            } as OptimisticComment);

                            return deletedComment;
                        } else {
                            // Remove entirely if no replies
                            optimisticUpdatesRef.current.set(optimisticId, {
                                id: commentId,
                                is_deleted: true,
                                isOptimistic: true,
                                optimisticId
                            } as OptimisticComment);
                            return null;
                        }
                    }
                    if (comment.replies.length > 0) {
                        return {
                            ...comment,
                            replies: updateCommentInTree(comment.replies).filter(Boolean) as OptimisticCommentWithReplies[]
                        };
                    }
                    return comment;
                }).filter(Boolean) as OptimisticCommentWithReplies[];
            };
            return updateCommentInTree(prevComments);
        });
    }, []);

    // Confirm optimistic update when API call succeeds
    const confirmOptimisticUpdate = useCallback((
        optimisticId: string,
        actualComment?: CommentWithAuthor
    ) => {
        optimisticUpdatesRef.current.delete(optimisticId);

        if (actualComment) {
            setCommentsState(prevComments => {
                const updateCommentInTree = (commentList: OptimisticCommentWithReplies[]): OptimisticCommentWithReplies[] => {
                    return commentList.map(comment => {
                        if (comment.optimisticId === optimisticId) {
                            return {
                                ...comment,
                                ...actualComment,
                                isOptimistic: false,
                                optimisticId: undefined,
                                error: undefined
                            };
                        }
                        if (comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: updateCommentInTree(comment.replies)
                            };
                        }
                        return comment;
                    });
                };
                return updateCommentInTree(prevComments);
            });
        } else {
            // Just remove optimistic flag
            setCommentsState(prevComments => {
                const updateCommentInTree = (commentList: OptimisticCommentWithReplies[]): OptimisticCommentWithReplies[] => {
                    return commentList.map(comment => {
                        if (comment.optimisticId === optimisticId) {
                            return {
                                ...comment,
                                isOptimistic: false,
                                optimisticId: undefined,
                                error: undefined
                            };
                        }
                        if (comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: updateCommentInTree(comment.replies)
                            };
                        }
                        return comment;
                    });
                };
                return updateCommentInTree(prevComments);
            });
        }
    }, []);

    // Reject optimistic update when API call fails
    const rejectOptimisticUpdate = useCallback((
        optimisticId: string,
        error: string
    ) => {
        const optimisticUpdate = optimisticUpdatesRef.current.get(optimisticId);
        
        if (optimisticUpdate) {
            if (onError) {
                onError(new Error(error), optimisticId);
            }

            // Mark the optimistic update with error
            setCommentsState(prevComments => {
                const updateCommentInTree = (commentList: OptimisticCommentWithReplies[]): OptimisticCommentWithReplies[] => {
                    return commentList.map(comment => {
                        if (comment.optimisticId === optimisticId) {
                            return {
                                ...comment,
                                error,
                                isOptimistic: true // Keep as optimistic to show error state
                            };
                        }
                        if (comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: updateCommentInTree(comment.replies)
                            };
                        }
                        return comment;
                    });
                };
                return updateCommentInTree(prevComments);
            });

            // Remove from optimistic updates after a delay to allow error display
            setTimeout(() => {
                optimisticUpdatesRef.current.delete(optimisticId);
                
                // Remove the failed optimistic update from UI
                setCommentsState(prevComments => {
                    const removeCommentFromTree = (commentList: OptimisticCommentWithReplies[]): OptimisticCommentWithReplies[] => {
                        return commentList.filter(comment => {
                            if (comment.optimisticId === optimisticId) {
                                return false; // Remove this comment
                            }
                            if (comment.replies.length > 0) {
                                comment.replies = removeCommentFromTree(comment.replies);
                            }
                            return true;
                        });
                    };
                    return removeCommentFromTree(prevComments);
                });
            }, 3000); // Show error for 3 seconds
        }
    }, [onError]);

    // Clear all optimistic updates
    const clearOptimisticUpdates = useCallback(() => {
        optimisticUpdatesRef.current.clear();
        setCommentsState(prevComments => {
            const clearOptimisticFromTree = (commentList: OptimisticCommentWithReplies[]): OptimisticCommentWithReplies[] => {
                return commentList
                    .filter(comment => {
                        // Keep comments that are not purely optimistic (i.e., they existed before)
                        return !comment.isOptimistic || !comment.optimisticId?.startsWith('temp-');
                    })
                    .map(comment => ({
                        ...comment,
                        // Clear optimistic flags but keep the comment
                        isOptimistic: undefined,
                        optimisticId: undefined,
                        error: undefined,
                        replies: clearOptimisticFromTree(comment.replies)
                    }));
            };
            return clearOptimisticFromTree(prevComments);
        });
    }, []);

    return {
        comments,
        setComments,
        addOptimisticComment,
        updateOptimisticComment,
        deleteOptimisticComment,
        confirmOptimisticUpdate,
        rejectOptimisticUpdate,
        clearOptimisticUpdates
    };
}

// Helper functions for optimistic comment hierarchy management
function flattenOptimisticHierarchy(comments: OptimisticCommentWithReplies[]): OptimisticComment[] {
    const flattened: OptimisticComment[] = [];

    const flatten = (comment: OptimisticCommentWithReplies) => {
        const { replies, reply_count, ...commentWithoutReplies } = comment;
        flattened.push(commentWithoutReplies);
        comment.replies.forEach(flatten);
    };

    comments.forEach(flatten);
    return flattened;
}

function buildOptimisticHierarchy(comments: OptimisticComment[]): OptimisticCommentWithReplies[] {
    const commentMap = new Map<string, OptimisticCommentWithReplies>();
    const rootComments: OptimisticCommentWithReplies[] = [];

    // First pass: Create all comment objects with empty replies
    comments.forEach(comment => {
        const commentWithReplies: OptimisticCommentWithReplies = {
            ...comment,
            replies: [],
            reply_count: 0
        };
        commentMap.set(comment.id, commentWithReplies);
    });

    // Second pass: Build the hierarchy
    comments.forEach(comment => {
        const commentWithReplies = commentMap.get(comment.id)!;

        if (comment.parent_comment_id) {
            // This is a reply, add it to parent's replies
            const parent = commentMap.get(comment.parent_comment_id);
            if (parent) {
                parent.replies.push(commentWithReplies);
                parent.reply_count = parent.replies.length;
            } else {
                // Parent not found (might be deleted), treat as root comment
                rootComments.push(commentWithReplies);
            }
        } else {
            // This is a root comment
            rootComments.push(commentWithReplies);
        }
    });

    // Sort root comments by creation time (oldest first)
    rootComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Recursively sort replies by creation time
    const sortReplies = (comment: OptimisticCommentWithReplies) => {
        comment.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        comment.replies.forEach(sortReplies);
    };

    rootComments.forEach(sortReplies);

    return rootComments;
}