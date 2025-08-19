"use client"

import { useState } from "react";
import { MessageCircle, MoreVertical, Edit2, Trash2, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateComment, validateCommentContent, deleteComment } from "@/lib/api/comments";
import { DeleteCommentDialog } from "./delete-comment-dialog";
import { ButtonLoadingState } from "./loading-states";
import { useErrorHandler } from "@/lib/error-handling";
import type { CommentWithAuthor } from "@/types/models";
import type { OptimisticComment } from "@/hooks/use-optimistic-comments";

interface CommentItemProps {
    comment: CommentWithAuthor | OptimisticComment;
    currentUserId?: string;
    canEdit?: boolean;
    onReply?: (commentId: string) => void;
    onEdit?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
    onCommentUpdated?: (updatedComment: CommentWithAuthor) => void;
    onCommentDeleted?: (commentId: string) => void;
    hasReplies?: boolean;
    className?: string;
}

/**
 * Formats a timestamp to relative time (e.g., "2 hours ago", "Yesterday")
 */
function formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Less than a minute
    if (diffInSeconds < 60) {
        return "just now";
    }

    // Less than an hour
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    // Less than a day
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }

    // Less than a week
    if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }

    // More than a week - show actual date
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

/**
 * Generates avatar initials from a name
 */
function generateAvatar(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

/**
 * Gets a consistent color for an avatar based on the name
 */
function getAvatarColor(name: string): string {
    const colors = [
        'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
        'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

export function CommentItem({
    comment,
    currentUserId,
    canEdit = false,
    onReply,
    onEdit,
    onDelete,
    onCommentUpdated,
    onCommentDeleted,
    hasReplies = false,
    className = ""
}: CommentItemProps) {
    const [showActions, setShowActions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const { handleError } = useErrorHandler();

    // Check if current user can edit/delete this comment
    const isOwner = currentUserId === comment.author_id;
    const canEditComment = canEdit && isOwner && !comment.is_deleted;
    const canDeleteComment = canEdit && isOwner && !comment.is_deleted;

    // Show edited indicator if comment was modified
    const wasEdited = comment.updated_at !== comment.created_at;

    // Handle edit button click
    const handleEditClick = () => {
        setIsEditing(true);
        setEditContent(comment.content);
        setEditError(null);
        if (onEdit) {
            onEdit(comment.id);
        }
    };

    // Handle edit cancel
    const handleEditCancel = () => {
        setIsEditing(false);
        setEditContent(comment.content);
        setEditError(null);
    };

    // Handle edit save
    const handleEditSave = async () => {
        setEditError(null);

        // Validate content
        const validation = validateCommentContent(editContent);
        if (!validation.isValid) {
            setEditError(validation.errors[0]?.message || "Invalid comment content");
            return;
        }

        // Check if content actually changed
        if (editContent.trim() === comment.content.trim()) {
            setIsEditing(false);
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await updateComment(comment.id, {
                content: editContent.trim()
            });

            if (result.error) {
                setEditError(result.error);
                return;
            }

            if (result.data) {
                // Update the comment with new data
                const updatedComment: CommentWithAuthor = {
                    ...comment,
                    content: result.data.content,
                    updated_at: result.data.updated_at
                };

                // Notify parent component of the update
                if (onCommentUpdated) {
                    onCommentUpdated(updatedComment);
                }

                setIsEditing(false);
            }
        } catch (err) {
            const appError = handleError(err, { 
                context: 'comment_edit', 
                commentId: comment.id 
            });
            setEditError(appError.userMessage || appError.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete button click
    const handleDeleteClick = () => {
        setShowDeleteDialog(true);
        if (onDelete) {
            onDelete(comment.id);
        }
    };

    // Handle delete confirmation
    const handleDeleteConfirm = async () => {
        setIsDeleting(true);

        try {
            const result = await deleteComment(comment.id);

            if (result.error) {
                console.error('Failed to delete comment:', result.error);
                // TODO: Show error toast/notification
                return;
            }

            // Notify parent component of the deletion
            if (onCommentDeleted) {
                onCommentDeleted(comment.id);
            }

            setShowDeleteDialog(false);
        } catch (err) {
            const appError = handleError(err, { 
                context: 'comment_delete', 
                commentId: comment.id 
            });
            console.error('Failed to delete comment:', appError);
            // Error handling is managed by parent component through optimistic updates
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle delete dialog close
    const handleDeleteCancel = () => {
        setShowDeleteDialog(false);
    };

    // Render deleted comment placeholder
    if (comment.is_deleted) {
        return (
            <div className={`group -mx-2 px-2 py-2 rounded transition-colors ${className}`}>
                <div className="flex space-x-3">
                    {/* Deleted comment avatar */}
                    <div className="w-8 h-8 rounded-lg bg-gray-300 flex items-center justify-center text-gray-500 font-semibold text-xs flex-shrink-0">
                        ?
                    </div>

                    {/* Deleted comment content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline space-x-2">
                            <span className="font-semibold text-gray-500 text-sm">
                                Deleted User
                            </span>
                            <span className="text-xs text-gray-400">
                                {formatRelativeTime(comment.created_at)}
                            </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500 italic">
                            This comment has been deleted
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div 
                className={`group hover:bg-gray-50 -mx-2 px-2 py-2 rounded transition-colors ${className}`}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
            >
                <div className="flex space-x-3">
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-lg ${getAvatarColor(comment.author.name)} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
                        {generateAvatar(comment.author.name)}
                    </div>

                    {/* Comment Content */}
                    <div className="flex-1 min-w-0">
                        {/* Header with author and timestamp */}
                        <div className="flex items-baseline space-x-2">
                            <span className="font-semibold text-gray-900 text-sm">
                                {comment.author.name}
                            </span>
                            <span className="text-xs text-gray-500">
                                {formatRelativeTime(comment.created_at)}
                            </span>
                            {wasEdited && (
                                <span className="text-xs text-gray-400 italic">
                                    (edited)
                                </span>
                            )}
                        </div>

                        {/* Comment text or edit form */}
                        {isEditing ? (
                            <div className="mt-1 space-y-2">
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    rows={3}
                                    disabled={isSubmitting}
                                    autoFocus
                                />
                                
                                {/* Character count */}
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span>{editContent.length}/2000 characters</span>
                                    {editContent.length > 2000 && (
                                        <span className="text-red-500">Character limit exceeded</span>
                                    )}
                                </div>

                                {/* Edit error */}
                                {editError && (
                                    <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-2 py-1">
                                        {editError}
                                    </div>
                                )}

                                {/* Edit actions */}
                                <div className="flex items-center space-x-2">
                                    <Button
                                        size="sm"
                                        onClick={handleEditSave}
                                        disabled={isSubmitting || editContent.length > 2000 || editContent.trim().length === 0}
                                        className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        <ButtonLoadingState
                                            isLoading={isSubmitting}
                                            loadingText="Saving..."
                                        >
                                            <Check size={12} className="mr-1" />
                                            Save
                                        </ButtonLoadingState>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleEditCancel}
                                        disabled={isSubmitting}
                                        className="h-7 px-3 text-xs"
                                    >
                                        <X size={12} className="mr-1" />
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-1">
                                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                                    'isOptimistic' in comment && comment.isOptimistic 
                                        ? 'text-gray-600' 
                                        : 'text-gray-900'
                                }`}>
                                    {comment.content}
                                </div>
                                
                                {/* Optimistic state indicator */}
                                {'isOptimistic' in comment && comment.isOptimistic && !comment.error && (
                                    <div className="flex items-center mt-1 text-xs text-gray-500">
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-1" />
                                        Sending...
                                    </div>
                                )}
                                
                                {/* Error state indicator */}
                                {'error' in comment && comment.error && (
                                    <div className="flex items-center mt-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        {comment.error}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action buttons - shown on hover, hidden when editing */}
                        {!isEditing && (
                            <div className={`flex items-center space-x-1 mt-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
                                {/* Reply button */}
                                {onReply && !comment.is_deleted && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                                        onClick={() => onReply(comment.id)}
                                    >
                                        <MessageCircle size={12} className="mr-1" />
                                        Reply
                                    </Button>
                                )}

                                {/* Edit button - only for comment owner */}
                                {canEditComment && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                                        onClick={handleEditClick}
                                    >
                                        <Edit2 size={12} className="mr-1" />
                                        Edit
                                    </Button>
                                )}

                                {/* Delete button - only for comment owner */}
                                {canDeleteComment && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={handleDeleteClick}
                                    >
                                        <Trash2 size={12} className="mr-1" />
                                        Delete
                                    </Button>
                                )}

                                {/* More actions button */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                                >
                                    <MoreVertical size={12} />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <DeleteCommentDialog
                isOpen={showDeleteDialog}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                isDeleting={isDeleting}
                hasReplies={hasReplies}
                commentAuthor={comment.author.name}
            />
        </div>
    );
}