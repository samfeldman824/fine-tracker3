"use client"

import { useState, useEffect } from "react";
import { MessageSquare, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommentInput } from "./comment-input";
import { CommentThread } from "./comment-thread";
import { getCommentsHierarchy } from "@/lib/api/comments";
import { createClient } from "@/lib/supabase/client";
import type { CommentWithReplies, CommentInsert } from "@/types/models";

interface CommentsSectionProps {
    fineId: string;
    currentUserId?: string;
    canEdit?: boolean;
    className?: string;
}

export function CommentsSection({
    fineId,
    currentUserId,
    canEdit = false,
    className = ""
}: CommentsSectionProps) {
    const [comments, setComments] = useState<CommentWithReplies[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch comments for the fine
    const fetchComments = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await getCommentsHierarchy(fineId);

            if (result.error) {
                setError(result.error);
                return;
            }

            if (result.data) {
                setComments(result.data.comments);
                setTotalCount(result.data.total_count);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load comments');
        } finally {
            setIsLoading(false);
        }
    };

    // Load comments on mount and when fineId changes
    useEffect(() => {
        if (fineId) {
            fetchComments();
        }
    }, [fineId]);

    // Handle new top-level comment submission
    const handleCommentSubmit = async (commentData: CommentInsert) => {
        setIsSubmitting(true);
        try {
            const supabase = createClient();

            const { data, error } = await supabase
                .from('comments')
                .insert(commentData)
                .select(`
                    id,
                    fine_id,
                    author_id,
                    parent_comment_id,
                    content,
                    created_at,
                    updated_at,
                    is_deleted,
                    author:users!comments_author_id_fkey(user_id, username, name)
                `)
                .single();

            if (error) {
                throw new Error(error.message);
            }

            // Refresh comments to get the updated hierarchy
            await fetchComments();

        } catch (err) {
            console.error('Failed to submit comment:', err);
            // The CommentInput component will handle displaying the error
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle reply submission
    const handleReplySubmit = async (parentId: string, content: string) => {
        if (!currentUserId) return;

        try {
            const supabase = createClient();

            const commentData: CommentInsert = {
                content: content.trim(),
                fine_id: fineId,
                author_id: currentUserId,
                parent_comment_id: parentId,
            };

            const { error } = await supabase
                .from('comments')
                .insert(commentData);

            if (error) {
                throw new Error(error.message);
            }

            // Refresh comments to get the updated hierarchy
            await fetchComments();

        } catch (err) {
            console.error('Failed to submit reply:', err);
            // TODO: Add proper error handling/notification
        }
    };

    // Handle comment edit
    const handleCommentEdit = async (commentId: string) => {
        // Edit functionality is handled inline by CommentItem
        console.log('Edit comment:', commentId);
    };

    // Handle comment update
    const handleCommentUpdate = (updatedComment: CommentWithReplies) => {
        setComments(prevComments => {
            const updateCommentInTree = (comments: CommentWithReplies[]): CommentWithReplies[] => {
                return comments.map(comment => {
                    if (comment.id === updatedComment.id) {
                        return { ...comment, ...updatedComment };
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
    };

    // Handle comment delete
    const handleCommentDelete = async (commentId: string) => {
        // TODO: Implement delete functionality in future task
        console.log('Delete comment:', commentId);
    };

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
        <div className={`comments-section ${className}`}>
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
                            onCommentUpdated={handleCommentUpdate}
                            className="bg-white border border-gray-100 rounded-lg p-4"
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