"use client"

import { useState } from "react";
import { MessageCircle, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CommentWithAuthor } from "@/types/models";

interface CommentItemProps {
    comment: CommentWithAuthor;
    currentUserId?: string;
    canEdit?: boolean;
    onReply?: (commentId: string) => void;
    onEdit?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
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
    className = ""
}: CommentItemProps) {
    const [showActions, setShowActions] = useState(false);

    // Check if current user can edit/delete this comment
    const isOwner = currentUserId === comment.author_id;
    const canEditComment = canEdit && isOwner && !comment.is_deleted;
    const canDeleteComment = canEdit && isOwner && !comment.is_deleted;

    // Show edited indicator if comment was modified
    const wasEdited = comment.updated_at !== comment.created_at;

    return (
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

                    {/* Comment text */}
                    <div className="mt-1 text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                    </div>

                    {/* Action buttons - shown on hover */}
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
                        {canEditComment && onEdit && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                                onClick={() => onEdit(comment.id)}
                            >
                                <Edit2 size={12} className="mr-1" />
                                Edit
                            </Button>
                        )}

                        {/* Delete button - only for comment owner */}
                        {canDeleteComment && onDelete && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => onDelete(comment.id)}
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
                </div>
            </div>
        </div>
    );
}