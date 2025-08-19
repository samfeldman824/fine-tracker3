"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { validateCommentContent } from "@/lib/api/comments";
import { useAuth } from "@/contexts/auth-context";
import type { CommentInsert, CommentFormData } from "@/types/models";

interface CommentInputProps {
    fineId: string;
    parentCommentId?: string;
    placeholder?: string;
    autoFocus?: boolean;
    onSubmit?: (comment: CommentInsert) => void;
    onCancel?: () => void;
    className?: string;
}

// Removed submitComment function - parent component handles database insertion

export function CommentInput({
    fineId,
    parentCommentId,
    placeholder = "Add a comment...",
    autoFocus = false,
    onSubmit,
    onCancel,
    className = ""
}: CommentInputProps) {
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Clear previous errors
        setError(null);

        // Validate content
        const validation = validateCommentContent(content);
        if (!validation.isValid) {
            setError(validation.errors[0]?.message || "Invalid comment content");
            return;
        }

        setIsSubmitting(true);

        try {
            // Check if user is authenticated using our custom auth context
            if (!user) {
                setError("You must be logged in to comment");
                return;
            }

            const commentData: CommentInsert = {
                content: content.trim(),
                fine_id: fineId,
                author_id: user.id,
                parent_comment_id: parentCommentId || null,
            };

            // Call the parent's onSubmit callback - let parent handle database insertion
            onSubmit?.(commentData);

            // Success - clear form
            setContent("");

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit comment");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setContent("");
        setError(null);
        onCancel?.();
    };

    const isValid = content.trim().length > 0 && content.trim().length <= 2000;

    return (
        <form onSubmit={handleSubmit} className={`space-y-3 ${className}`} role="form">
            <div className="space-y-2">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#7d6c64] rounded-md resize-none focus:outline-none focus:border-[#6b4a41] focus:ring-1 focus:ring-[#6b4a41] placeholder:text-gray-400"
                    disabled={isSubmitting}
                />

                {/* Character count */}
                <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{content.length}/2000 characters</span>
                    {content.length > 2000 && (
                        <span className="text-red-500">Character limit exceeded</span>
                    )}
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {error}
                </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end space-x-2">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    size="sm"
                    className="bg-[#7d6c64] hover:bg-[#6b4a41] text-white"
                    disabled={!isValid || isSubmitting}
                >
                    {isSubmitting ? "Posting..." : "Post Comment"}
                </Button>
            </div>
        </form>
    )};