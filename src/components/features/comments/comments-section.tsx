"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, Loader2, AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommentInput } from "./comment-input";
import { CommentThread } from "./comment-thread";
import { getCommentsHierarchy, createComment, updateComment, deleteComment } from "@/lib/api/comments";
import { useRealtimeComments, applyRealtimeUpdateToComments } from "@/hooks/use-realtime-comments";
import { useOptimisticComments } from "@/hooks/use-optimistic-comments";
import type { CommentWithReplies, CommentInsert, CommentUpdate } from "@/types/models";

interface CommentsSectionProps {
    fineId: string;
    currentUserId?: string;
    currentUserName?: string;
    currentUserUsername?: string;
    canEdit?: boolean;
    className?: string;
    enableRealtime?: boolean;
}

export function CommentsSection({
    fineId,
    currentUserId,
    currentUserName = "Unknown User",
    currentUserUsername = "unknown",
    canEdit = false,
    className = "",
    enableRealtime = true
}: CommentsSectionProps) {
    const [baseComments, setBaseComments] = useState<CommentWithReplies[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
    const [realtimeError, setRealtimeError] = useState<string | null>(null);
    const scrollPositionRef = useRef<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Optimistic updates hook
    const {
        comments,
        setComments: setOptimisticComments,
        addOptimisticComment,
        updateOptimisticComment,
        deleteOptimisticComment,
        confirmOptimisticUpdate,
        rejectOptimisticUpdate,
        clearOptimisticUpdates
    } = useOptimisticComments({
        initialComments: baseComments,
        onError: (error, optimisticId) => {
            console.error('Optimistic update error:', error, optimisticId);
        }
    });

    // Real-time subscription hook
    const { isSubscribed } = useRealtimeComments({
        fineId,
        enabled: enableRealtime,
        onCommentChange: useCallback((update) => {
            // Preserve scroll position during real-time updates
            if (containerRef.current) {
                scrollPositionRef.current = containerRef.current.scrollTop;
            }

            // Apply real-time update to base comments
            setBaseComments(prevComments => {
                const updatedComments = applyRealtimeUpdateToComments(prevComments, update);
                
                // Also update optimistic comments to sync with real-time changes
                setOptimisticComments(updatedComments);
                
                return updatedComments;
            });

            // Restore scroll position after update
            setTimeout(() => {
                if (containerRef.current) {
                    containerRef.current.scrollTop = scrollPositionRef.current;
                }
            }, 0);
        }, [setOptimisticComments]),
        onError: useCallback((error) => {
            setRealtimeError(error.message);
            setIsRealtimeConnected(false);
        }, [])
    });

    // Update realtime connection status
    useEffect(() => {
        setIsRealtimeConnected(isSubscribed);
        if (isSubscribed) {
            setRealtimeError(null);
        }
    }, [isSubscribed]);

    // Fetch comments for the fine
    const fetchComments = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await getCommentsHierarchy(fineId);

            if (result.error) {
                setError(result.error);
                return;
            }

            if (result.data) {
                setBaseComments(result.data.comments);
                setOptimisticComments(result.data.comments);
                setTotalCount(result.data.total_count);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load comments');
        } finally {
            setIsLoading(false);
        }
    }, [fineId, setOptimisticComments]);

    // Load comments on mount and when fineId changes
    useEffect(() => {
        if (fineId) {
            fetchComments();
        }
    }, [fineId]);

    // Handle new top-level comment submission with optimistic updates
    const handleCommentSubmit = useCallback(async (commentData: CommentInsert) => {
        if (!currentUserId) return;

        const optimisticId = `temp-${Date.now()}-${Math.random()}`;
        const author = {
            user_id: currentUserId,
            username: currentUserUsername,
            name: currentUserName
        };

        setIsSubmitting(true);

        // Add optimistic comment immediately
        addOptimisticComment(commentData, optimisticId, author);

        try {
            const result = await createComment(commentData);

            if (result.error) {
                throw new Error(result.error);
            }

            // Confirm optimistic update with actual data
            if (result.data) {
                const commentWithAuthor = {
                    ...result.data,
                    author
                };
                confirmOptimisticUpdate(optimisticId, commentWithAuthor);
                
                // Update total count
                setTotalCount(prev => prev + 1);
            }
        } catch (err) {
            console.error('Failed to submit comment:', err);
            rejectOptimisticUpdate(optimisticId, err instanceof Error ? err.message : 'Failed to submit comment');
        } finally {
            setIsSubmitting(false);
        }
    }, [currentUserId, currentUserName, currentUserUsername, addOptimisticComment, confirmOptimisticUpdate, rejectOptimisticUpdate]);

    // Handle reply submission with optimistic updates
    const handleReplySubmit = useCallback(async (parentId: string, content: string) => {
        if (!currentUserId) return;

        const optimisticId = `temp-reply-${Date.now()}-${Math.random()}`;
        const author = {
            user_id: currentUserId,
            username: currentUserUsername,
            name: currentUserName
        };

        const commentData: CommentInsert = {
            content: content.trim(),
            fine_id: fineId,
            author_id: currentUserId,
            parent_comment_id: parentId,
        };

        // Add optimistic reply immediately
        addOptimisticComment(commentData, optimisticId, author);

        try {
            const result = await createComment(commentData);

            if (result.error) {
                throw new Error(result.error);
            }

            // Confirm optimistic update with actual data
            if (result.data) {
                const commentWithAuthor = {
                    ...result.data,
                    author
                };
                confirmOptimisticUpdate(optimisticId, commentWithAuthor);
                
                // Update total count
                setTotalCount(prev => prev + 1);
            }
        } catch (err) {
            console.error('Failed to submit reply:', err);
            rejectOptimisticUpdate(optimisticId, err instanceof Error ? err.message : 'Failed to submit reply');
        }
    }, [currentUserId, currentUserName, currentUserUsername, fineId, addOptimisticComment, confirmOptimisticUpdate, rejectOptimisticUpdate]);

    // Handle comment edit
    const handleCommentEdit = useCallback(async (commentId: string) => {
        // Edit functionality is handled inline by CommentItem
        console.log('Edit comment:', commentId);
    }, []);

    // Handle comment update with optimistic updates
    const handleCommentUpdate = useCallback(async (commentId: string, updateData: CommentUpdate) => {
        const optimisticId = `update-${commentId}-${Date.now()}`;

        // Apply optimistic update immediately
        updateOptimisticComment(commentId, updateData, optimisticId);

        try {
            const result = await updateComment(commentId, updateData);

            if (result.error) {
                throw new Error(result.error);
            }

            // Confirm optimistic update
            confirmOptimisticUpdate(optimisticId);
        } catch (err) {
            console.error('Failed to update comment:', err);
            rejectOptimisticUpdate(optimisticId, err instanceof Error ? err.message : 'Failed to update comment');
        }
    }, [updateOptimisticComment, confirmOptimisticUpdate, rejectOptimisticUpdate]);

    // Handle comment delete with optimistic updates
    const handleCommentDelete = useCallback(async (commentId: string) => {
        const optimisticId = `delete-${commentId}-${Date.now()}`;

        // Apply optimistic delete immediately
        deleteOptimisticComment(commentId, optimisticId);

        try {
            const result = await deleteComment(commentId);

            if (result.error) {
                throw new Error(result.error);
            }

            // Confirm optimistic update
            confirmOptimisticUpdate(optimisticId);
        } catch (err) {
            console.error('Failed to delete comment:', err);
            rejectOptimisticUpdate(optimisticId, err instanceof Error ? err.message : 'Failed to delete comment');
        }
    }, [deleteOptimisticComment, confirmOptimisticUpdate, rejectOptimisticUpdate]);

    // Handle retry on error
    const handleRetry = () => {
        fetchComments();
    };

    // Loading state
    if (isLoading) {
        return (
            <div className={`comments-section ${className}`}>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                    <span className="ml-2 text-gray-500">Loading comments...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`comments-section ${className}`}>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                    <p className="text-red-600 mb-4">Failed to load comments</p>
                    <p className="text-sm text-gray-500 mb-4">{error}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        className="flex items-center"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={`comments-section ${className}`} ref={containerRef}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Comments
                    </h3>
                    {totalCount > 0 && (
                        <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded-full">
                            {totalCount}
                        </span>
                    )}
                </div>
                
                {/* Real-time connection status */}
                {enableRealtime && (
                    <div className="flex items-center space-x-2">
                        {isRealtimeConnected ? (
                            <div className="flex items-center text-green-600 text-xs">
                                <Wifi className="h-3 w-3 mr-1" />
                                Live
                            </div>
                        ) : (
                            <div className="flex items-center text-gray-400 text-xs">
                                <WifiOff className="h-3 w-3 mr-1" />
                                Offline
                            </div>
                        )}
                        {realtimeError && (
                            <div className="text-red-500 text-xs" title={realtimeError}>
                                Connection Error
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* New comment input */}
            <div className="mb-6">
                <CommentInput
                    fineId={fineId}
                    placeholder="Add a comment..."
                    onSubmit={handleCommentSubmit}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                />
            </div>

            {/* Comments list */}
            {comments.length === 0 ? (
                // Empty state
                <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                        No comments yet
                    </h4>
                    <p className="text-gray-500">
                        Be the first to share your thoughts on this fine.
                    </p>
                </div>
            ) : (
                // Comments threads
                <div className="space-y-4">
                    {comments.map((comment) => (
                        <CommentThread
                            key={comment.id}
                            comment={comment}
                            depth={0}
                            currentUserId={currentUserId}
                            canEdit={canEdit}
                            onReply={handleReplySubmit}
                            onEdit={handleCommentEdit}
                            onDelete={handleCommentDelete}
                            onCommentUpdated={(updatedComment) => {
                                // Handle legacy comment update format
                                if ('content' in updatedComment && 'updated_at' in updatedComment) {
                                    handleCommentUpdate(updatedComment.id, {
                                        content: updatedComment.content,
                                        updated_at: updatedComment.updated_at
                                    });
                                }
                            }}
                            className={`bg-white border border-gray-100 rounded-lg p-4 ${
                                comment.isOptimistic ? 'opacity-75' : ''
                            } ${comment.error ? 'border-red-200 bg-red-50' : ''}`}
                        />
                    ))}
                </div>
            )}

            {/* Loading overlay for new comment submission */}
            {isSubmitting && (
                <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-4 shadow-lg flex items-center">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
                        <span className="text-gray-700">Posting comment...</span>
                    </div>
                </div>
            )}
        </div>
    );
}