"use client"

import { useState } from "react";
import { Send, AlertCircle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { validateCommentContent } from "@/lib/api/comments";
import { ButtonLoadingState } from "./loading-states";
import { useErrorHandler } from "@/lib/error-handling";
import type { CommentInsert } from "@/types/models";

interface CommentInputProps {
    fineId: string;
    parentCommentId?: string;
    placeholder?: string;
    autoFocus?: boolean;
    onSubmit?: (comment: CommentInsert) => void;
    onCancel?: () => void;
    className?: string;
}

async function submitComment(commentData: CommentInsert) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select()
        .single();

    if (error) {
        console.error('Error creating comment:', error);
        return { data: null, error: error.message };
    }

    return { data, error: null };
}

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
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    
    const { handleError } = useErrorHandler();

    // Listen for online/offline events
    useState(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    });

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
            // Get current user from Supabase auth
            const supabase = createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                setError("You must be logged in to comment");
                return;
            }

            const commentData: CommentInsert = {
                content: content.trim(),
                fine_id: fineId,
                author_id: user.id,
                parent_comment_id: parentCommentId || null,
            };

            const result = await submitComment(commentData);

            if (result.error) {
                setError(result.error);
                return;
            }

            // Success - clear form and call callback
            setContent("");
            onSubmit?.(commentData);

        } catch (err) {
            const appError = handleError(err, { 
                context: 'comment_input_submit', 
                fineId, 
                parentCommentId 
            });
            setError(appError.userMessage || appError.message);
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
            {/* Network status indicator */}
            {!isOnline && (
                <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    <WifiOff className="h-4 w-4" />
                    <span>You&apos;re offline. Your comment will be posted when you&apos;re back online.</span>
                </div>
            )}
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
                <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
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
                    <ButtonLoadingState
                        isLoading={isSubmitting}
                        loadingText="Posting..."
                    >
                        <Send className="h-4 w-4 mr-2" />
                        Post Comment
                    </ButtonLoadingState>
                </Button>
            </div>
        </form>
    )};