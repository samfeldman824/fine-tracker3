import { createClient } from "@/lib/supabase/server";
import type {
    Comment,
    CommentInsert,
    CommentUpdate,
    CommentWithAuthor,
    CommentWithReplies,
    CommentsResponse
} from "@/types/models";
import type { SupabaseResponse } from "@/types/api";

/**
 * Fetches all comments for a specific fine with author information
 * Includes deleted comments that have replies to preserve thread structure
 * @param fineId - The ID of the fine to fetch comments for
 * @returns Promise<SupabaseResponse<CommentWithAuthor[]>>
 */
export async function getCommentsByFineId(fineId: string): Promise<SupabaseResponse<CommentWithAuthor[]>> {
    try {
        const supabase = await createClient();

        // First, get all non-deleted comments
        const { data: activeComments, error: activeError } = await supabase
            .from('comments')
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
            .eq('fine_id', fineId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });

        if (activeError) {
            console.error('Error fetching active comments:', activeError);
            return { data: null, error: activeError.message };
        }

        // Get deleted comments that have replies (to preserve thread structure)
        const { data: deletedWithReplies, error: deletedError } = await supabase
            .from('comments')
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
            .eq('fine_id', fineId)
            .eq('is_deleted', true)
            .in('id', 
                // Subquery to find deleted comments that have replies
                supabase
                    .from('comments')
                    .select('parent_comment_id')
                    .eq('fine_id', fineId)
                    .not('parent_comment_id', 'is', null)
            );

        // Combine active comments with deleted comments that have replies
        const allComments = [...(activeComments || [])];
        
        if (deletedWithReplies && !deletedError) {
            // Filter deleted comments to only include those that actually have replies
            const deletedCommentsWithReplies = deletedWithReplies.filter(deletedComment => 
                (activeComments || []).some(comment => comment.parent_comment_id === deletedComment.id)
            );
            allComments.push(...deletedCommentsWithReplies);
        }

        // Transform the data to match CommentWithAuthor type
        const transformedData: CommentWithAuthor[] = allComments.map(comment => ({
            id: comment.id,
            fine_id: comment.fine_id,
            author_id: comment.author_id,
            parent_comment_id: comment.parent_comment_id,
            content: comment.content,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            is_deleted: comment.is_deleted,
            author: Array.isArray(comment.author)
                ? comment.author[0] || { user_id: '', username: 'Unknown', name: 'Unknown User' }
                : comment.author || { user_id: '', username: 'Unknown', name: 'Unknown User' }
        }));

        return { data: transformedData, error: null };
    } catch (error) {
        console.error('Failed to fetch comments:', error);
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Creates a new comment
 * @param commentData - The comment data to insert
 * @returns Promise<SupabaseResponse<Comment>>
 */
export async function createComment(commentData: CommentInsert): Promise<SupabaseResponse<Comment>> {
    try {
        const supabase = await createClient();

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
    } catch (error) {
        console.error('Failed to create comment:', error);
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Updates an existing comment
 * @param commentId - The ID of the comment to update
 * @param updateData - The data to update
 * @returns Promise<SupabaseResponse<Comment>>
 */
export async function updateComment(commentId: string, updateData: CommentUpdate): Promise<SupabaseResponse<Comment>> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('comments')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', commentId)
            .select()
            .single();

        if (error) {
            console.error('Error updating comment:', error);
            return { data: null, error: error.message };
        }

        return { data, error: null };
    } catch (error) {
        console.error('Failed to update comment:', error);
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Soft deletes a comment by marking it as deleted
 * @param commentId - The ID of the comment to delete
 * @returns Promise<SupabaseResponse<Comment>>
 */
export async function deleteComment(commentId: string): Promise<SupabaseResponse<Comment>> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('comments')
            .update({
                is_deleted: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', commentId)
            .select()
            .single();

        if (error) {
            console.error('Error deleting comment:', error);
            return { data: null, error: error.message };
        }

        return { data, error: null };
    } catch (error) {
        console.error('Failed to delete comment:', error);
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
/**
 *
 Builds a hierarchical comment structure from flat comment array
 * @param comments - Flat array of comments with author information
 * @returns CommentWithReplies[] - Hierarchical comment structure
 */
export function buildCommentHierarchy(comments: CommentWithAuthor[]): CommentWithReplies[] {
    const commentMap = new Map<string, CommentWithReplies>();
    const rootComments: CommentWithReplies[] = [];

    // First pass: Create all comment objects with empty replies
    comments.forEach(comment => {
        const commentWithReplies: CommentWithReplies = {
            ...comment,
            replies: [],
            reply_count: 0
        };
        commentMap.set(comment.id, commentWithReplies);
    });

    // Second pass: Build the hierarchy
    comments.forEach(comment => {
        const commentWithReplies = commentMap.get(comment.id)!;

        if (comment.parent_comment_id) {
            // This is a reply, add it to parent's replies
            const parent = commentMap.get(comment.parent_comment_id);
            if (parent) {
                parent.replies.push(commentWithReplies);
                parent.reply_count = parent.replies.length;
            } else {
                // Parent not found (might be deleted), treat as root comment
                rootComments.push(commentWithReplies);
            }
        } else {
            // This is a root comment
            rootComments.push(commentWithReplies);
        }
    });

    // Sort root comments by creation time (oldest first)
    rootComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Recursively sort replies by creation time
    const sortReplies = (comment: CommentWithReplies) => {
        comment.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        comment.replies.forEach(sortReplies);
    };

    rootComments.forEach(sortReplies);

    return rootComments;
}

/**
 * Gets comments for a fine and returns them in hierarchical structure
 * @param fineId - The ID of the fine to fetch comments for
 * @returns Promise<SupabaseResponse<CommentsResponse>>
 */
export async function getCommentsHierarchy(fineId: string): Promise<SupabaseResponse<CommentsResponse>> {
    const result = await getCommentsByFineId(fineId);

    if (result.error) {
        return { data: null, error: result.error };
    }

    const comments = buildCommentHierarchy(result.data || []);
    const total_count = result.data?.length || 0;

    return {
        data: { comments, total_count },
        error: null
    };
}

/**
 * Counts total replies for a comment (including nested replies)
 * @param comment - The comment to count replies for
 * @returns number - Total number of replies
 */
export function countTotalReplies(comment: CommentWithReplies): number {
    let count = comment.replies.length;
    comment.replies.forEach(reply => {
        count += countTotalReplies(reply);
    });
    return count;
}

/**
 * Flattens a hierarchical comment structure back to a flat array
 * @param comments - Hierarchical comment structure
 * @returns CommentWithAuthor[] - Flat array of comments
 */
export function flattenCommentHierarchy(comments: CommentWithReplies[]): CommentWithAuthor[] {
    const flattened: CommentWithAuthor[] = [];

    const flatten = (comment: CommentWithReplies) => {
        // Add the comment without the replies and reply_count properties
        const { replies, reply_count, ...commentWithoutReplies } = comment;
        flattened.push(commentWithoutReplies);

        // Recursively flatten replies
        comment.replies.forEach(flatten);
    };

    comments.forEach(flatten);
    return flattened;
}/**
 
* Validation functions for comments
 */

export type CommentValidationError = {
    field: string;
    message: string;
};

export type CommentValidationResult = {
    isValid: boolean;
    errors: CommentValidationError[];
};

/**
 * Validates comment content
 * @param content - The comment content to validate
 * @returns CommentValidationResult
 */
export function validateCommentContent(content: string): CommentValidationResult {
    const errors: CommentValidationError[] = [];

    // Check if content is provided
    if (!content || content.trim().length === 0) {
        errors.push({
            field: 'content',
            message: 'Comment content is required'
        });
    }

    // Check content length (minimum 1 character, maximum 2000 characters)
    const trimmedContent = content.trim();
    if (trimmedContent.length > 2000) {
        errors.push({
            field: 'content',
            message: 'Comment content must be 2000 characters or less'
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validates comment form data
 * @param formData - The comment form data to validate
 * @returns CommentValidationResult
 */
export function validateCommentFormData(formData: { content: string; fine_id: string; parent_comment_id?: string }): CommentValidationResult {
    const errors: CommentValidationError[] = [];

    // Validate content
    const contentValidation = validateCommentContent(formData.content);
    errors.push(...contentValidation.errors);

    // Validate fine_id
    if (!formData.fine_id || formData.fine_id.trim().length === 0) {
        errors.push({
            field: 'fine_id',
            message: 'Fine ID is required'
        });
    }

    // Validate parent_comment_id format if provided
    if (formData.parent_comment_id !== undefined && formData.parent_comment_id.trim().length === 0) {
        errors.push({
            field: 'parent_comment_id',
            message: 'Parent comment ID cannot be empty if provided'
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Checks if a user can edit a comment
 * @param comment - The comment to check
 * @param userId - The ID of the user attempting to edit
 * @returns boolean
 */
export function canUserEditComment(comment: Comment, userId: string): boolean {
    return comment.author_id === userId && !comment.is_deleted;
}

/**
 * Checks if a user can delete a comment
 * @param comment - The comment to check
 * @param userId - The ID of the user attempting to delete
 * @returns boolean
 */
export function canUserDeleteComment(comment: Comment, userId: string): boolean {
    return comment.author_id === userId && !comment.is_deleted;
}

/**
 * Checks if a comment can be replied to
 * @param comment - The comment to check
 * @returns boolean
 */
export function canReplyToComment(comment: Comment): boolean {
    return !comment.is_deleted;
}