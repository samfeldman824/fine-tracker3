"use client"

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildCommentHierarchy } from "@/lib/api/comments";
import type { CommentWithAuthor, CommentWithReplies } from "@/types/models";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface RealtimeCommentUpdate {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    comment: CommentWithAuthor;
    oldComment?: CommentWithAuthor;
}

export interface UseRealtimeCommentsOptions {
    fineId: string;
    onCommentChange?: (update: RealtimeCommentUpdate) => void;
    onError?: (error: Error) => void;
    enabled?: boolean;
}

export interface UseRealtimeCommentsReturn {
    subscribe: () => void;
    unsubscribe: () => void;
    isSubscribed: boolean;
}

/**
 * Custom hook for managing real-time comment subscriptions
 * Handles insert, update, and delete operations with optimistic updates
 */
export function useRealtimeComments({
    fineId,
    onCommentChange,
    onError,
    enabled = true
}: UseRealtimeCommentsOptions): UseRealtimeCommentsReturn {
    const channelRef = useRef<RealtimeChannel | null>(null);
    const isSubscribedRef = useRef(false);
    const supabaseRef = useRef(createClient());

    // Handle real-time comment changes
    const handleRealtimeChange = useCallback(async (
        payload: RealtimePostgresChangesPayload<any>
    ) => {
        try {
            const { eventType, new: newRecord, old: oldRecord } = payload;

            // Only process changes for the current fine
            const recordFineId = newRecord?.fine_id || oldRecord?.fine_id;
            if (recordFineId !== fineId) {
                return;
            }

            let commentWithAuthor: CommentWithAuthor | null = null;
            let oldCommentWithAuthor: CommentWithAuthor | undefined;

            // For INSERT and UPDATE, we need to fetch the author information
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
                if (newRecord) {
                    const { data: authorData, error: authorError } = await supabaseRef.current
                        .from('users')
                        .select('user_id, username, name')
                        .eq('user_id', newRecord.author_id)
                        .single();

                    if (authorError) {
                        console.error('Error fetching author for real-time update:', authorError);
                        return;
                    }

                    commentWithAuthor = {
                        id: newRecord.id,
                        fine_id: newRecord.fine_id,
                        author_id: newRecord.author_id,
                        parent_comment_id: newRecord.parent_comment_id,
                        content: newRecord.content,
                        created_at: newRecord.created_at,
                        updated_at: newRecord.updated_at,
                        is_deleted: newRecord.is_deleted,
                        author: authorData
                    };
                }
            }

            // For DELETE, we use the old record
            if (eventType === 'DELETE' && oldRecord) {
                // For soft deletes, we might still have the record with is_deleted = true
                // For hard deletes, we need to construct from old record
                const { data: authorData } = await supabaseRef.current
                    .from('users')
                    .select('user_id, username, name')
                    .eq('user_id', oldRecord.author_id)
                    .single();

                commentWithAuthor = {
                    id: oldRecord.id,
                    fine_id: oldRecord.fine_id,
                    author_id: oldRecord.author_id,
                    parent_comment_id: oldRecord.parent_comment_id,
                    content: oldRecord.content,
                    created_at: oldRecord.created_at,
                    updated_at: oldRecord.updated_at,
                    is_deleted: true, // Mark as deleted for real-time handling
                    author: authorData || { user_id: '', username: 'Unknown', name: 'Unknown User' }
                };
            }

            // For UPDATE, also prepare old comment data if needed
            if (eventType === 'UPDATE' && oldRecord) {
                const { data: oldAuthorData } = await supabaseRef.current
                    .from('users')
                    .select('user_id, username, name')
                    .eq('user_id', oldRecord.author_id)
                    .single();

                oldCommentWithAuthor = {
                    id: oldRecord.id,
                    fine_id: oldRecord.fine_id,
                    author_id: oldRecord.author_id,
                    parent_comment_id: oldRecord.parent_comment_id,
                    content: oldRecord.content,
                    created_at: oldRecord.created_at,
                    updated_at: oldRecord.updated_at,
                    is_deleted: oldRecord.is_deleted,
                    author: oldAuthorData || { user_id: '', username: 'Unknown', name: 'Unknown User' }
                };
            }

            if (commentWithAuthor && onCommentChange) {
                onCommentChange({
                    type: eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                    comment: commentWithAuthor,
                    oldComment: oldCommentWithAuthor
                });
            }
        } catch (error) {
            console.error('Error handling real-time comment change:', error);
            if (onError) {
                onError(error instanceof Error ? error : new Error('Unknown real-time error'));
            }
        }
    }, [fineId, onCommentChange, onError]);

    // Subscribe to real-time changes
    const subscribe = useCallback(() => {
        if (!enabled || isSubscribedRef.current || !fineId) {
            return;
        }

        try {
            const supabase = supabaseRef.current;
            
            // Create a channel for this fine's comments
            const channel = supabase
                .channel(`comments:fine_id=eq.${fineId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'comments',
                        filter: `fine_id=eq.${fineId}`
                    },
                    handleRealtimeChange
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        isSubscribedRef.current = true;
                        console.log(`Subscribed to real-time comments for fine ${fineId}`);
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('Error subscribing to real-time comments');
                        isSubscribedRef.current = false;
                        if (onError) {
                            onError(new Error('Failed to subscribe to real-time comments'));
                        }
                    }
                });

            channelRef.current = channel;
        } catch (error) {
            console.error('Error setting up real-time subscription:', error);
            if (onError) {
                onError(error instanceof Error ? error : new Error('Failed to setup real-time subscription'));
            }
        }
    }, [enabled, fineId, handleRealtimeChange, onError]);

    // Unsubscribe from real-time changes
    const unsubscribe = useCallback(() => {
        if (channelRef.current) {
            const supabase = supabaseRef.current;
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
            isSubscribedRef.current = false;
            console.log(`Unsubscribed from real-time comments for fine ${fineId}`);
        }
    }, [fineId]);

    // Auto-subscribe when enabled and fineId changes
    useEffect(() => {
        if (enabled && fineId) {
            subscribe();
        }

        return () => {
            unsubscribe();
        };
    }, [enabled, fineId, subscribe, unsubscribe]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            unsubscribe();
        };
    }, [unsubscribe]);

    return {
        subscribe,
        unsubscribe,
        isSubscribed: isSubscribedRef.current
    };
}

/**
 * Utility function to apply real-time updates to comment hierarchy
 * Handles optimistic updates with proper hierarchy maintenance
 */
export function applyRealtimeUpdateToComments(
    comments: CommentWithReplies[],
    update: RealtimeCommentUpdate
): CommentWithReplies[] {
    const { type, comment, oldComment } = update;

    switch (type) {
        case 'INSERT': {
            // Add new comment to the hierarchy
            const flatComments = flattenCommentHierarchy(comments);
            flatComments.push(comment);
            return buildCommentHierarchy(flatComments);
        }

        case 'UPDATE': {
            // Update existing comment in the hierarchy
            const updateCommentInTree = (commentList: CommentWithReplies[]): CommentWithReplies[] => {
                return commentList.map(c => {
                    if (c.id === comment.id) {
                        return {
                            ...c,
                            ...comment,
                            replies: c.replies, // Preserve existing replies
                            reply_count: c.reply_count // Preserve reply count
                        };
                    }
                    if (c.replies.length > 0) {
                        return {
                            ...c,
                            replies: updateCommentInTree(c.replies)
                        };
                    }
                    return c;
                });
            };
            return updateCommentInTree(comments);
        }

        case 'DELETE': {
            // Handle soft delete - keep comment if it has replies, otherwise remove
            const updateCommentInTree = (commentList: CommentWithReplies[]): CommentWithReplies[] => {
                return commentList.map(c => {
                    if (c.id === comment.id) {
                        if (c.replies.length > 0) {
                            // Keep comment but mark as deleted
                            return {
                                ...c,
                                ...comment,
                                replies: c.replies, // Preserve replies
                                reply_count: c.reply_count
                            };
                        } else {
                            // Remove comment entirely if no replies
                            return null;
                        }
                    }
                    if (c.replies.length > 0) {
                        return {
                            ...c,
                            replies: updateCommentInTree(c.replies).filter(Boolean) as CommentWithReplies[]
                        };
                    }
                    return c;
                }).filter(Boolean) as CommentWithReplies[];
            };
            return updateCommentInTree(comments);
        }

        default:
            return comments;
    }
}

/**
 * Helper function to flatten comment hierarchy for rebuilding
 */
function flattenCommentHierarchy(comments: CommentWithReplies[]): CommentWithAuthor[] {
    const flattened: CommentWithAuthor[] = [];

    const flatten = (comment: CommentWithReplies) => {
        const { replies, reply_count, ...commentWithoutReplies } = comment;
        flattened.push(commentWithoutReplies);
        comment.replies.forEach(flatten);
    };

    comments.forEach(flatten);
    return flattened;
}