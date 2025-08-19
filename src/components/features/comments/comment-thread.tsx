"use client"

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommentItem } from "./comment-item";
import { CommentInput } from "./comment-input";
import type { CommentWithReplies } from "@/types/models";

interface CommentThreadProps {
    comment: CommentWithReplies;
    depth?: number;
    maxDepth?: number;
    currentUserId?: string;
    canEdit?: boolean;
    onReply?: (parentId: string, content: string) => void;
    onEdit?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
    className?: string;
}

const MAX_VISUAL_DEPTH = 6; // Maximum visual indentation levels
const INDENT_SIZE = 20; // Pixels per indentation level

export function CommentThread({
    comment,
    depth = 0,
    maxDepth = 10,
    currentUserId,
    canEdit = false,
    onReply,
    onEdit,
    onDelete,
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
                <div className="flex items-center mb-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
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
            )}

            {/* Main comment */}
            <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                canEdit={canEdit}
                onReply={handleReplyClick}
                onEdit={onEdit}
                onDelete={onDelete}
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