"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, Loader2, AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommentInput } from "./comment-input";
import { CommentThread } from "./comment-thread";
import { getCommentsHierarchy, createComment, updateComment, deleteComment } from "@/lib/api/comments";
import { useRealtimeComments, applyRealtimeUpdateToComments } from "@/hooks/use-realtime-comments";
import { useOptimisticComments } from "@/hooks/use-optimistic-comments";
import { useApiRetry } from "@/hooks/use-retry";
import { CommentErrorBoundary } from "./error-boundary";
import {
    CommentsLoadingSkeleton,
    LoadingOverlay,
    CommentsEmptyState,
    CommentsErrorState,
    NetworkStatusIndicator
} from "./loading-states";
import { ToastContainer, useToast } from "./error-toast";
import { useErrorHandler, getRecoveryStrategy } from "@/lib/error-handling";
import type { CommentWithReplies, CommentInsert, CommentUpdate, CommentWithAuthor } from "@/types/models";

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
    const [operationLoading, setOperationLoading] = useState<{
        type: 'create' | 'update' | 'delete' | null;
        commentId?: string;
    }>({ type: null });
    const scrollPositionRef = useRef<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Enhanced error handling and user feedback
    const { toasts, dismissToast, success, error: showError, warning } = useToast();
    const { handleError } = useErrorHandler();

    // Retry mechanism for API operations
    const {
        executeWithRetry,
        manualRetry,
        isRetrying,
        lastError: retryError,
        canRetry
    } = useApiRetry({
        maxAttempts: 3,
        delay: 1000,
        onRetry: (attempt, error) => {
            console.warn(`Comments API retry attempt ${attempt}:`, error.message);
        }
    });

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
        onCommentChange: useCallback((update: { type: 'INSERT' | 'UPDATE' | 'DELETE'; comment: CommentWithAuthor; oldComment?: CommentWithAuthor }) => {
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
        onError: useCallback((error: Error) => {
            const appError = handleError(error, { context: 'realtime_connection' });
            setRealtimeError(appError.userMessage || appError.message);
            setIsRealtimeConnected(false);

            // Show user-friendly error notification
            warning(
                'Connection Issue',
                'Real-time updates are temporarily unavailable. Comments will still work, but you may need to refresh to see updates from others.',
                { duration: 8000 }
            );
        }, [handleError, warning])
    });

    // Update realtime connection status
    useEffect(() => {
        setIsRealtimeConnected(isSubscribed);
        if (isSubscribed) {
            setRealtimeError(null);
        }
    }, [isSubscribed]);

    // Fetch comments for the fine with retry mechanism
    const fetchComments = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await executeWithRetry(() => getCommentsHierarchy(fineId));

            if (result.error) {
                throw new Error(result.error);
            }

            if (result.data) {
                setBaseComments(result.data.comments);
                setOptimisticComments(result.data.comments);
                setTotalCount(result.data.total_count);
            }
        } catch (err) {
            const appError = handleError(err, { context: 'fetch_comments', fineId });
            setError(appError.userMessage || appError.message);

            // Show error notification with recovery options
            const recovery = getRecoveryStrategy(appError);
            showError(
                'Failed to Load Comments',
                appError.userMessage,
                {
                    action: recovery.canRecover ? {
                        label: recovery.actionLabel || 'Retry',
                        onClick: () => fetchComments()
                    } : undefined
                }
            );
        } finally {
            setIsLoading(false);
        }
    }, [fineId, setOptimisticComments, executeWithRetry]);

    // Load comments on mount and when fineId changes
    useEffect(() => {
        if (fineId) {
            fetchComments();
        }
    }, [fineId]);

    // Handle new top-level comment submission with optimistic updates and retry
    const handleCommentSubmit = useCallback(async (commentData: CommentInsert) => {
        if (!currentUserId) return;

        const optimisticId = `temp-${Date.now()}-${Math.random()}`;
        const author = {
            user_id: currentUserId,
            username: currentUserUsername,
            name: currentUserName
        };

        setIsSubmitting(true);
        setOperationLoading({ type: 'create' });

        // Add optimistic comment immediately
        addOptimisticComment(commentData, optimisticId, author);

        try {
            const result = await executeWithRetry(() => createComment(commentData));

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

                // Show success notification
                success('Comment Posted', 'Your comment has been added successfully.');
            }
        } catch (err) {
            const appError = handleError(err, { context: 'create_comment', fineId });
            rejectOptimisticUpdate(optimisticId, appError.userMessage || appError.message);

            // Show error notification with retry option
            const recovery = getRecoveryStrategy(appError);
            showError(
                'Failed to Post Comment',
                appError.userMessage,
                {
                    action: recovery.canRecover ? {
                        label: 'Retry',
                        onClick: () => handleCommentSubmit(commentData)
                    } : undefined
                }
            );
        } finally {
            setIsSubmitting(false);
            setOperationLoading({ type: null });
        }
    }, [currentUserId, currentUserName, currentUserUsername, addOptimisticComment, confirmOptimisticUpdate, rejectOptimisticUpdate, executeWithRetry]);

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

                // Show success notification
                success('Reply Posted', 'Your reply has been added successfully.');
            }
        } catch (err) {
            const appError = handleError(err, { context: 'create_reply', fineId, parentId });
            rejectOptimisticUpdate(optimisticId, appError.userMessage || appError.message);

            // Show error notification
            showError(
                'Failed to Post Reply',
                appError.userMessage,
                {
                    action: getRecoveryStrategy(appError).canRecover ? {
                        label: 'Retry',
                        onClick: () => handleReplySubmit(parentId, content)
                    } : undefined
                }
            );
        }
    }, [currentUserId, currentUserName, currentUserUsername, fineId, addOptimisticComment, confirmOptimisticUpdate, rejectOptimisticUpdate]);

    // Handle comment edit
    const handleCommentEdit = useCallback(async (commentId: string) => {
        // Edit functionality is handled inline by CommentItem
        console.log('Edit comment:', commentId);
    }, []);

    // Handle comment update with optimistic updates and retry
    const handleCommentUpdate = useCallback(async (commentId: string, updateData: CommentUpdate) => {
        const optimisticId = `update-${commentId}-${Date.now()}`;

        setOperationLoading({ type: 'update', commentId });

        // Apply optimistic update immediately
        updateOptimisticComment(commentId, updateData, optimisticId);

        try {
            const result = await executeWithRetry(() => updateComment(commentId, updateData));

            if (result.error) {
                throw new Error(result.error);
            }

            // Confirm optimistic update
            confirmOptimisticUpdate(optimisticId);

            // Show success notification
            success('Comment Updated', 'Your comment has been updated successfully.');
        } catch (err) {
            const appError = handleError(err, { context: 'update_comment', commentId });
            rejectOptimisticUpdate(optimisticId, appError.userMessage || appError.message);

            // Show error notification
            showError(
                'Failed to Update Comment',
                appError.userMessage,
                {
                    action: getRecoveryStrategy(appError).canRecover ? {
                        label: 'Retry',
                        onClick: () => handleCommentUpdate(commentId, updateData)
                    } : undefined
                }
            );
        } finally {
            setOperationLoading({ type: null });
        }
    }, [updateOptimisticComment, confirmOptimisticUpdate, rejectOptimisticUpdate, executeWithRetry]);

    // Handle comment delete with optimistic updates and retry
    const handleCommentDelete = useCallback(async (commentId: string) => {
        const optimisticId = `delete-${commentId}-${Date.now()}`;

        setOperationLoading({ type: 'delete', commentId });

        // Apply optimistic delete immediately
        deleteOptimisticComment(commentId, optimisticId);

        try {
            const result = await executeWithRetry(() => deleteComment(commentId));

            if (result.error) {
                throw new Error(result.error);
            }

            // Confirm optimistic update
            confirmOptimisticUpdate(optimisticId);

            // Show success notification
            success('Comment Deleted', 'Your comment has been deleted successfully.');
        } catch (err) {
            const appError = handleError(err, { context: 'delete_comment', commentId });
            rejectOptimisticUpdate(optimisticId, appError.userMessage || appError.message);

            // Show error notification
            showError(
                'Failed to Delete Comment',
                appError.userMessage,
                {
                    action: getRecoveryStrategy(appError).canRecover ? {
                        label: 'Retry',
                        onClick: () => handleCommentDelete(commentId)
                    } : undefined
                }
            );
        } finally {
            setOperationLoading({ type: null });
        }
    }, [deleteOptimisticComment, confirmOptimisticUpdate, rejectOptimisticUpdate, executeWithRetry]);

    // Handle retry on error
    const handleRetry = useCallback(() => {
        manualRetry(() => fetchComments());
    }, [manualRetry, fetchComments]);

    // Loading state
    if (isLoading && !isRetrying) {
        return (
            <div className={`comments-section ${className}`}>
                <CommentsLoadingSkeleton />
            </div>
        );
    }

    // Error state
    if (error && !canRetry) {
        return (
            <div className={`comments-section ${className}`}>
                <CommentsErrorState
                    title="Failed to load comments"
                    description={error}
                    onRetry={handleRetry}
                    showRetry={canRetry}
                />
            </div>
        );
    }

    return (
        <CommentErrorBoundary>
            <div className={`comments-section relative ${className}`} ref={containerRef}>
                {/* Toast notifications */}
                <ToastContainer
                    toasts={toasts}
                    onDismiss={dismissToast}
                    position="top-right"
                />
                {/* Loading overlay for operations */}
                <LoadingOverlay
                    isVisible={isRetrying || operationLoading.type !== null}
                    message={
                        isRetrying ? 'Retrying...' :
                            operationLoading.type === 'create' ? 'Posting comment...' :
                                operationLoading.type === 'update' ? 'Updating comment...' :
                                    operationLoading.type === 'delete' ? 'Deleting comment...' :
                                        'Loading...'
                    }
                />

                {/* Network status indicator */}
                <NetworkStatusIndicator
                    isOnline={navigator.onLine}
                    className="mb-4"
                />

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

                {/* Error banner for retry errors */}
                {retryError && canRetry && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <span className="text-sm text-red-800">
                                    {retryError.message}
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRetry}
                                disabled={isRetrying}
                                className="text-red-700 border-red-300 hover:bg-red-100"
                            >
                                {isRetrying ? (
                                    <>
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        Retrying...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Retry
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

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
                    <CommentsEmptyState />
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
                                className={`bg-white border border-gray-100 rounded-lg p-4 relative ${comment.isOptimistic ? 'opacity-75' : ''
                                    } ${comment.error ? 'border-red-200 bg-red-50' : ''} ${operationLoading.commentId === comment.id ? 'pointer-events-none' : ''
                                    }`}
                            />
                        ))}
                    </div>
                )}

            </div>
        </CommentErrorBoundary>
    );
}