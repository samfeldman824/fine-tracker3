import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentInput } from '../comment-input';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
jest.mock('@/lib/supabase/client');
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Mock the validation function
jest.mock('@/lib/api/comments', () => ({
  validateCommentContent: jest.fn((content: string) => {
    if (!content || content.trim().length === 0) {
      return {
        isValid: false,
        errors: [{ field: 'content', message: 'Comment content is required' }]
      };
    }
    if (content.trim().length > 2000) {
      return {
        isValid: false,
        errors: [{ field: 'content', message: 'Comment content must be 2000 characters or less' }]
      };
    }
    return { isValid: true, errors: [] };
  })
}));

describe('CommentInput', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabaseClient as any);
  });

  const defaultProps = {
    fineId: 'test-fine-id'
  };

  it('renders with default placeholder', () => {
    render(<CommentInput {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<CommentInput {...defaultProps} placeholder="Reply to comment..." />);
    
    expect(screen.getByPlaceholderText('Reply to comment...')).toBeInTheDocument();
  });

  it('shows character count', () => {
    render(<CommentInput {...defaultProps} />);
    
    expect(screen.getByText('0/2000 characters')).toBeInTheDocument();
  });

  it('updates character count when typing', async () => {
    const user = userEvent.setup();
    render(<CommentInput {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText('Add a comment...');
    await user.type(textarea, 'Hello world');
    
    expect(screen.getByText('11/2000 characters')).toBeInTheDocument();
  });

  it('shows character limit exceeded warning', async () => {
    const user = userEvent.setup();
    render(<CommentInput {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText('Add a comment...');
    const longText = 'a'.repeat(2001);
    await user.type(textarea, longText);
    
    expect(screen.getByText('Character limit exceeded')).toBeInTheDocument();
  });

  it('disables submit button when content is empty', () => {
    render(<CommentInput {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: 'Post Comment' });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when content is valid', async () => {
    const user = userEvent.setup();
    render(<CommentInput {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText('Add a comment...');
    await user.type(textarea, 'Valid comment');
    
    const submitButton = screen.getByRole('button', { name: 'Post Comment' });
    expect(submitButton).not.toBeDisabled();
  });

  it('disables submit button when content exceeds limit', async () => {
    const user = userEvent.setup();
    render(<CommentInput {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText('Add a comment...');
    const longText = 'a'.repeat(2001);
    await user.type(textarea, longText);
    
    const submitButton = screen.getByRole('button', { name: 'Post Comment' });
    expect(submitButton).toBeDisabled();
  });

  it('shows cancel button when onCancel prop is provided', () => {
    const mockOnCancel = jest.fn();
    render(<CommentInput {...defaultProps} onCancel={mockOnCancel} />);
    
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnCancel = jest.fn();
    render(<CommentInput {...defaultProps} onCancel={mockOnCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('clears content when cancel is clicked', async () => {
    const user = userEvent.setup();
    const mockOnCancel = jest.fn();
    render(<CommentInput {...defaultProps} onCancel={mockOnCancel} />);
    
    const textarea = screen.getByPlaceholderText('Add a comment...');
    await user.type(textarea, 'Some content');
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);
    
    expect(textarea).toHaveValue('');
  });

  it('shows loading state when submitting', async () => {
    const user = userEvent.setup();
    
    // Mock successful auth but delay the response
    mockSupabaseClient.auth.getUser.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          data: { user: { id: 'user-123' } },
          error: null
        }), 100)
      )
    );
    
    // Mock successful comment creation
    const mockInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: { id: 'comment-123' },
          error: null
        })
      }))
    }));
    mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });
    
    render(<CommentInput {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText('Add a comment...');
    await user.type(textarea, 'Test comment');
    
    const submitButton = screen.getByRole('button', { name: 'Post Comment' });
    await user.click(submitButton);
    
    // Check that the button shows loading state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Posting...' })).toBeInTheDocument();
    });
  });

  it('shows error when user is not authenticated', async () => {
    const user = userEvent.setup();
    
    // Mock auth failure
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    });
    
    render(<CommentInput {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText('Add a comment...');
    await user.type(textarea, 'Test comment');
    
    const submitButton = screen.getByRole('button', { name: 'Post Comment' });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('You must be logged in to comment')).toBeInTheDocument();
    });
  });

  it('shows error when comment submission fails', async () => {
    const user = userEvent.setup();
    
    // Mock successful auth
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
    
    // Mock failed comment creation
    const mockInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      }))
    }));
    mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });
    
    render(<CommentInput {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText('Add a comment...');
    await user.type(textarea, 'Test comment');
    
    const submitButton = screen.getByRole('button', { name: 'Post Comment' });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Database error')).toBeInTheDocument();
    });
  });

  it('calls onSubmit callback on successful submission', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn();
    
    // Mock successful auth
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
    
    // Mock successful comment creation
    const mockInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: { id: 'comment-123' },
          error: null
        })
      }))
    }));
    mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });
    
    render(<CommentInput {...defaultProps} onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('Add a comment...');
    await user.type(textarea, 'Test comment');
    
    const submitButton = screen.getByRole('button', { name: 'Post Comment' });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        content: 'Test comment',
        fine_id: 'test-fine-id',
        author_id: 'user-123',
        parent_comment_id: null
      });
    });
  });

  it('clears form after successful submission', async () => {
    const user = userEvent.setup();
    
    // Mock successful auth
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
    
    // Mock successful comment creation
    const mockInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: { id: 'comment-123' },
          error: null
        })
      }))
    }));
    mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });
    
    render(<CommentInput {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText('Add a comment...');
    await user.type(textarea, 'Test comment');
    
    const submitButton = screen.getByRole('button', { name: 'Post Comment' });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });

  it('includes parent comment ID when provided', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn();
    
    // Mock successful auth
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
    
    // Mock successful comment creation
    const mockInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: { id: 'comment-123' },
          error: null
        })
      }))
    }));
    mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });
    
    render(
      <CommentInput 
        {...defaultProps} 
        parentCommentId="parent-123"
        onSubmit={mockOnSubmit} 
      />
    );
    
    const textarea = screen.getByPlaceholderText('Add a comment...');
    await user.type(textarea, 'Reply comment');
    
    const submitButton = screen.getByRole('button', { name: 'Post Comment' });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        content: 'Reply comment',
        fine_id: 'test-fine-id',
        author_id: 'user-123',
        parent_comment_id: 'parent-123'
      });
    });
  });

  it('shows validation error for empty content', async () => {
    const user = userEvent.setup();
    render(<CommentInput {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText('Add a comment...');
    const submitButton = screen.getByRole('button', { name: 'Post Comment' });
    
    // Add some content first to enable the button
    await user.type(textarea, 'test');
    // Then clear it to trigger validation
    await user.clear(textarea);
    
    // Now the button should be disabled, but let's try to submit via form
    const form = screen.getByRole('form');
    fireEvent.submit(form);
    
    await waitFor(() => {
      expect(screen.getByText('Comment content is required')).toBeInTheDocument();
    });
  });

  it('applies autoFocus when prop is true', () => {
    render(<CommentInput {...defaultProps} autoFocus={true} />);
    
    const textarea = screen.getByPlaceholderText('Add a comment...');
    expect(textarea).toHaveFocus();
  });

  it('applies custom className', () => {
    render(<CommentInput {...defaultProps} className="custom-class" />);
    
    const form = screen.getByRole('form');
    expect(form).toHaveClass('custom-class');
  });
});