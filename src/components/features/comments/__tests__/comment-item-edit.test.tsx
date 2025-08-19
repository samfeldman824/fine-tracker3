import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommentItem } from '../comment-item';
import { updateComment, validateCommentContent } from '@/lib/api/comments';
import type { CommentWithAuthor } from '@/types/models';

// Mock the API functions
jest.mock('@/lib/api/comments', () => ({
    updateComment: jest.fn(),
    validateCommentContent: jest.fn()
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled, ...props }: {
        children: React.ReactNode;
        onClick?: () => void;
        disabled?: boolean;
        [key: string]: unknown;
    }) => (
        <button onClick={onClick} disabled={disabled} {...props}>
            {children}
        </button>
    )
}));

describe('CommentItem - Edit Functionality', () => {
    const mockUpdateComment = updateComment as jest.MockedFunction<typeof updateComment>;
    const mockValidateCommentContent = validateCommentContent as jest.MockedFunction<typeof validateCommentContent>;

    const mockComment: CommentWithAuthor = {
        id: '1',
        fine_id: 'fine-1',
        author_id: 'user-1',
        parent_comment_id: null,
        content: 'Original comment content',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_deleted: false,
        author: {
            user_id: 'user-1',
            username: 'testuser',
            name: 'Test User'
        }
    };

    const mockOnEdit = jest.fn();
    const mockOnCommentUpdated = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockValidateCommentContent.mockReturnValue({
            isValid: true,
            errors: []
        });
    });

    it('shows edit button for comment owner when canEdit is true', () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={mockOnEdit}
            />
        );

        // Hover to show actions
        fireEvent.mouseEnter(screen.getByText('Original comment content').closest('.group')!);

        expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('does not show edit button for non-owner', () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-2"
                canEdit={true}
                onEdit={mockOnEdit}
            />
        );

        // Hover to show actions
        fireEvent.mouseEnter(screen.getByText('Original comment content').closest('.group')!);

        expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('does not show edit button when canEdit is false', () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={false}
                onEdit={mockOnEdit}
            />
        );

        // Hover to show actions
        fireEvent.mouseEnter(screen.getByText('Original comment content').closest('.group')!);

        expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('enters edit mode when edit button is clicked', async () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={mockOnEdit}
            />
        );

        // Hover to show actions
        fireEvent.mouseEnter(screen.getByText('Original comment content').closest('.group')!);

        // Click edit button
        fireEvent.click(screen.getByText('Edit'));

        // Should show edit form
        await waitFor(() => {
            expect(screen.getByDisplayValue('Original comment content')).toBeInTheDocument();
            expect(screen.getByText('Save')).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });

        // Should hide action buttons
        expect(screen.queryByText('Edit')).not.toBeInTheDocument();
        expect(screen.queryByText('Reply')).not.toBeInTheDocument();

        // Should call onEdit callback
        expect(mockOnEdit).toHaveBeenCalledWith('1');
    });

    it('shows character count in edit mode', async () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={mockOnEdit}
            />
        );

        // Enter edit mode
        fireEvent.mouseEnter(screen.getByText('Original comment content').closest('.group')!);
        fireEvent.click(screen.getByText('Edit'));

        await waitFor(() => {
            expect(screen.getByText(/\d+\/2000 characters/)).toBeInTheDocument();
        });
    });

    it('shows character limit exceeded warning', async () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={mockOnEdit}
            />
        );

        // Enter edit mode
        fireEvent.mouseEnter(screen.getByText('Original comment content').closest('.group')!);
        fireEvent.click(screen.getByText('Edit'));

        // Type content that exceeds limit
        const textarea = screen.getByDisplayValue('Original comment content');
        fireEvent.change(textarea, { target: { value: 'a'.repeat(2001) } });

        await waitFor(() => {
            expect(screen.getByText('Character limit exceeded')).toBeInTheDocument();
            expect(screen.getByText('Save')).toBeDisabled();
        });
    });

    it('cancels edit mode when cancel button is clicked', async () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={mockOnEdit}
            />
        );

        // Enter edit mode
        fireEvent.mouseEnter(screen.getByText('Original comment content').closest('.group')!);
        fireEvent.click(screen.getByText('Edit'));

        // Modify content
        const textarea = screen.getByDisplayValue('Original comment content');
        fireEvent.change(textarea, { target: { value: 'Modified content' } });

        // Click cancel
        fireEvent.click(screen.getByText('Cancel'));

        // Should exit edit mode and restore original content
        await waitFor(() => {
            expect(screen.getByText('Original comment content')).toBeInTheDocument();
            expect(screen.queryByDisplayValue('Modified content')).not.toBeInTheDocument();
        });
    });

    it('saves comment when save button is clicked', async () => {
        mockUpdateComment.mockResolvedValue({
            data: {
                ...mockComment,
                content: 'Updated content',
                updated_at: '2024-01-01T01:00:00Z'
            },
            error: null
        });

        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={mockOnEdit}
                onCommentUpdated={mockOnCommentUpdated}
            />
        );

        // Enter edit mode
        fireEvent.mouseEnter(screen.getByText('Original comment content').closest('.group')!);
        fireEvent.click(screen.getByText('Edit'));

        // Modify content
        const textarea = screen.getByDisplayValue('Original comment content');
        fireEvent.change(textarea, { target: { value: 'Updated content' } });

        // Click save
        fireEvent.click(screen.getByText('Save'));

        // Should call updateComment API
        await waitFor(() => {
            expect(mockUpdateComment).toHaveBeenCalledWith('1', {
                content: 'Updated content'
            });
        });

        // Should call onCommentUpdated callback
        expect(mockOnCommentUpdated).toHaveBeenCalledWith({
            ...mockComment,
            content: 'Updated content',
            updated_at: '2024-01-01T01:00:00Z'
        });

        // Should exit edit mode
        expect(screen.queryByDisplayValue('Updated content')).not.toBeInTheDocument();
    });

    it('does not save when content is unchanged', async () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={mockOnEdit}
                onCommentUpdated={mockOnCommentUpdated}
            />
        );

        // Enter edit mode
        fireEvent.mouseEnter(screen.getByText('Original comment content').closest('.group')!);
        fireEvent.click(screen.getByText('Edit'));

        // Click save without changing content
        fireEvent.click(screen.getByText('Save'));

        // Should not call updateComment API
        expect(mockUpdateComment).not.toHaveBeenCalled();

        // Should exit edit mode
        await waitFor(() => {
            expect(screen.queryByDisplayValue('Original comment content')).not.toBeInTheDocument();
        });
    });

    it('shows validation error when content is invalid', async () => {
        mockValidateCommentContent.mockReturnValue({
            isValid: false,
            errors: [{ field: 'content', message: 'Content is too long' }]
        });

        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={mockOnEdit}
            />
        );

        // Enter edit mode
        fireEvent.mouseEnter(screen.getByText('Original comment content').closest('.group')!);
        fireEvent.click(screen.getByText('Edit'));

        // Set content that would pass the empty check but fail validation
        const textarea = screen.getByDisplayValue('Original comment content');
        fireEvent.change(textarea, { target: { value: 'Some content' } });

        // Click save
        fireEvent.click(screen.getByText('Save'));

        // Should show validation error
        await waitFor(() => {
            expect(screen.getByText(/Content is too long/)).toBeInTheDocument();
        });

        // Should not call updateComment API
        expect(mockUpdateComment).not.toHaveBeenCalled();
    });

    it('shows API error when update fails', async () => {
        mockUpdateComment.mockResolvedValue({
            data: null,
            error: 'Failed to update comment'
        });

        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={mockOnEdit}
            />
        );

        // Enter edit mode
        fireEvent.mouseEnter(screen.getByText('Original comment content').closest('.group')!);
        fireEvent.click(screen.getByText('Edit'));

        // Modify content
        const textarea = screen.getByDisplayValue('Original comment content');
        fireEvent.change(textarea, { target: { value: 'Updated content' } });

        // Click save
        fireEvent.click(screen.getByText('Save'));

        // Should show API error
        await waitFor(() => {
            expect(screen.getByText('Failed to update comment')).toBeInTheDocument();
        });

        // Should remain in edit mode
        expect(screen.getByDisplayValue('Updated content')).toBeInTheDocument();
    });

    it('shows loading state while saving', async () => {
        mockUpdateComment.mockImplementation(() => new Promise(() => {})); // Never resolves

        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={mockOnEdit}
            />
        );

        // Enter edit mode
        fireEvent.mouseEnter(screen.getByText('Original comment content').closest('.group')!);
        fireEvent.click(screen.getByText('Edit'));

        // Modify content
        const textarea = screen.getByDisplayValue('Original comment content');
        fireEvent.change(textarea, { target: { value: 'Updated content' } });

        // Click save
        fireEvent.click(screen.getByText('Save'));

        // Should show loading state
        await waitFor(() => {
            expect(screen.getByText('Saving...')).toBeInTheDocument();
        });

        // Save button should be disabled
        expect(screen.getByText('Saving...')).toBeDisabled();
    });

    it('shows edited indicator for modified comments', () => {
        const editedComment = {
            ...mockComment,
            updated_at: '2024-01-01T01:00:00Z' // Different from created_at
        };

        render(
            <CommentItem
                comment={editedComment}
                currentUserId="user-1"
                canEdit={true}
            />
        );

        expect(screen.getByText('(edited)')).toBeInTheDocument();
    });

    it('does not show edited indicator for unmodified comments', () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
            />
        );

        expect(screen.queryByText('(edited)')).not.toBeInTheDocument();
    });

    it('disables save button when content is empty', async () => {
        render(
            <CommentItem
                comment={mockComment}
                currentUserId="user-1"
                canEdit={true}
                onEdit={mockOnEdit}
            />
        );

        // Enter edit mode
        fireEvent.mouseEnter(screen.getByText('Original comment content').closest('.group')!);
        fireEvent.click(screen.getByText('Edit'));

        // Clear content
        const textarea = screen.getByDisplayValue('Original comment content');
        fireEvent.change(textarea, { target: { value: '   ' } }); // Only whitespace

        await waitFor(() => {
            expect(screen.getByText('Save')).toBeDisabled();
        });
    });
});