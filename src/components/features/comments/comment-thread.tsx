"use client"

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommentItem } from "./comment-item";
import { CommentInput } from "./comment-input";
import { CommentAvatars } from "./comment-avatars";
import { extractThreadUsers } from "@/lib/api/comments";
import type { CommentWithReplies } from "@/types/models";
import type { OptimisticCommentWithReplies } from "@/hooks/use-optimistic-comments";

interface CommentThreadProps {
    comment: CommentWithReplies | OptimisticCommentWithReplies;
    depth?: number;
    maxDepth?: number;
    currentUserId?: string;
    canEdit?: boolean;
    onReply?: (parentId: string, content: string) => void;
    onEdit?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
    onCommentUpdated?: (updatedComment: CommentWithReplies) => void;
    className?: string;
}

const MAX_VISUAL_DEPTH = 6; // Maximum visual indentation levels
const INDENT_SIZE = 20; // Pixels per indentation level

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

export function CommentThread({
    comment,
    depth = 0,
    maxDepth = 10,
    currentUserId,
    canEdit = false,
    onReply,
    onEdit,
    onDelete,
    onCommentUpdated,
    className = ""
}: CommentThreadProps) {
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Calculate visual indentation (capped at MAX_VISUAL_DEPTH)
    const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH);
    const indentStyle = {
        marginLeft: visualDepth > 0 ? `${visualDepth * INDENT_SIZE}px` : '0px'
    };

    // Determine if we should show collapse/expand for deeply nested threads
    const hasReplies = comment.replies && comment.replies.length > 0;
    const showCollapseToggle = hasReplies && depth > 2;

    // Handle reply submission
    const handleReplySubmit = (content: string) => {
        if (onReply) {
            onReply(comment.id, content);
        }
        setShowReplyInput(false);
    };

    // Handle reply button click
    const handleReplyClick = () => {
        setShowReplyInput(true);
    };

    // Handle cancel reply
    const handleCancelReply = () => {
        setShowReplyInput(false);
    };

    // Handle collapse toggle
    const handleCollapseToggle = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className={`comment-thread ${className}`} style={indentStyle}>
            {/* Thread collapse/expand button for deeply nested comments */}
            {showCollapseToggle && (
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                        {/* Participant avatars - only for threads with replies */}
                        {comment.reply_count > 0 && (
                            <CommentAvatars
                                users={extractThreadUsers(comment)}
                                maxVisible={3}
                                size="sm"
                                className="flex-shrink-0"
                            />
                        )}
                        
                        {/* Reply count and collapse button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={handleCollapseToggle}
                        >
                            {isCollapsed ? (
                                <>
                                    <ChevronRight size={12} className="mr-1" />
                                    {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
                                </>
                            ) : (
                                <>
                                    <ChevronDown size={12} className="mr-1" />
                                    Hide replies
                                </>
                            )}
                        </Button>
                    </div>
                    
                    {/* Last reply time */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="text-xs text-gray-500">
                            Last reply {formatRelativeTime(comment.replies[comment.replies.length - 1].created_at)}
                        </div>
                    )}
                </div>
            )}

            {/* Main comment */}
            <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                canEdit={canEdit}
                onReply={handleReplyClick}
                onEdit={onEdit}
                onDelete={onDelete}
                onCommentUpdated={(updatedComment) => {
                    if (onCommentUpdated) {
                        onCommentUpdated({
                            ...comment,
                            ...updatedComment
                        });
                    }
                }}
                onCommentDeleted={(commentId) => {
                    if (onCommentUpdated) {
                        // Mark the comment as deleted in the thread
                        onCommentUpdated({
                            ...comment,
                            is_deleted: true,
                            content: ''
                        });
                    }
                }}
                hasReplies={hasReplies}
                showParticipantAvatars={depth === 0 && hasReplies}
                className={depth > 0 ? "border-l-2 border-gray-100 pl-4" : ""}
            />

            {/* Reply input */}
            {showReplyInput && (
                <div className="mt-3 ml-11"> {/* Align with comment content */}
                    <CommentInput
                        fineId={comment.fine_id}
                        parentCommentId={comment.id}
                        placeholder={`Reply to ${comment.author.name}...`}
                        autoFocus={true}
                        onSubmit={(commentData) => handleReplySubmit(commentData.content)}
                        onCancel={handleCancelReply}
                        className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                    />
                </div>
            )}

            {/* Nested replies */}
            {hasReplies && !isCollapsed && depth < maxDepth && (
                <div className="mt-2 space-y-2">
                    {comment.replies.map((reply) => (
                        <CommentThread
                            key={reply.id}
                            comment={reply}
                            depth={depth + 1}
                            maxDepth={maxDepth}
                            currentUserId={currentUserId}
                            canEdit={canEdit}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onCommentUpdated={onCommentUpdated}
                        />
                    ))}
                </div>
            )}

            {/* Show "Continue thread" link for max depth reached */}
            {hasReplies && depth >= maxDepth && (
                <div className="mt-2 ml-11">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        onClick={() => {
                            // TODO: Implement navigation to full thread view
                            console.log('Navigate to full thread view for comment:', comment.id);
                        }}
                    >
                        Continue thread ({comment.reply_count} more {comment.reply_count === 1 ? 'reply' : 'replies'})
                    </Button>
                </div>
            )}
        </div>
    );
}