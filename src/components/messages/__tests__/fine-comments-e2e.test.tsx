import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FinesSlackInterface from '../slack';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';

// Mock the auth context
jest.mock('@/contexts/auth-context', () => ({
    useAuth: jest.fn()
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
    createClient: jest.fn()
}));

// Mock the CommentsSection component with more realistic behavior
jest.mock('@/components/features/comments', () => ({
    CommentsSection: ({ fineId, currentUserId, onCommentCountChange }: { 
        fineId: string; 
        currentUserId?: string;
        onCommentCountChange?: (fineId: string, count: number) => void;
    }) => {
        const [comments, setComments] = React.useState<string[]>([]);
        const [newComment, setNewComment] = React.useState('');

        const addComment = () => {
            if (newComment.trim()) {
                const updatedComments = [...comments, newComment];
                setComments(updatedComments);
                setNewComment('');
                // Simulate updating comment count
                if (onCommentCountChange) {
                    onCommentCountChange(fineId, updatedComments.length);
                }
            }
        };

        return (
            <div data-testid={`comments-section-${fineId}`} className="p-4 bg-gray-50 rounded">
                <h3 className="font-semibold mb-2">Comments for Fine {fineId}</h3>
                <div className="space-y-2 mb-4">
                    {comments.map((comment, index) => (
                        <div key={index} className="p-2 bg-white rounded border">
                            <span className="text-sm font-medium">{currentUserId}: </span>
                            <span className="text-sm">{comment}</span>
                        </div>
                    ))}
                    {comments.length === 0 && (
                        <p className="text-gray-500 text-sm">No comments yet</p>
                    )}
                </div>
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 border rounded text-sm"
                        data-testid={`comment-input-${fineId}`}
                    />
                    <button
                        onClick={addComment}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        data-testid={`comment-submit-${fineId}`}
                    >
                        Post
                    </button>
                </div>
            </div>
        );
    }
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Mock fine data
const mockFines = [
    {
        id: 'fine-1',
        date: '2025-08-18T10:00:00Z',
        fine_type: 'Fine',
        description: 'Late to practice',
        amount: 500,
        replies: 0,
        subject: { name: 'John Doe' },
        proposer: { name: 'Coach Smith' }
    },
    {
        id: 'fine-2',
        date: '2025-08-18T11:00:00Z',
        fine_type: 'Credit',
        description: 'Great performance',
        amount: 200,
        replies: 0,
        subject: { name: 'Jane Wilson' },
        proposer: { name: 'Coach Smith' }
    }
];

describe('Fine Comments End-to-End Integration', () => {
    let mockSupabase: any;

    beforeEach(() => {
        // Mock auth user
        mockUseAuth.mockReturnValue({
            user: {
                id: 'user-123',
                name: 'Test User',
                username: 'testuser',
                email: 'test@example.com',
                role: 'player'
            },
            loading: false,
            signOut: jest.fn()
        });

        // Mock Supabase client
        mockSupabase = {
            from: jest.fn(() => ({
                select: jest.fn(() => ({
                    in: jest.fn(() => ({
                        eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
                    })),
                    eq: jest.fn(() => ({
                        eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
                    })),
                    order: jest.fn(() => Promise.resolve({ data: mockFines, error: null }))
                }))
            })),
            channel: jest.fn(() => ({
                on: jest.fn(() => ({
                    subscribe: jest.fn()
                }))
            })),
            removeChannel: jest.fn()
        };

        mockCreateClient.mockReturnValue(mockSupabase);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should provide complete fine-to-comments workflow', async () => {
        render(<FinesSlackInterface refreshKey={0} />);

        // Wait for fines to load
        await waitFor(() => {
            expect(screen.getByText(/Late to practice/)).toBeInTheDocument();
            expect(screen.getByText(/Great performance/)).toBeInTheDocument();
        });

        // Initially, no comment counts should be visible
        expect(screen.queryByText(/💬/)).not.toBeInTheDocument();

        // Click to expand comments for the first fine
        const addCommentButtons = screen.getAllByText('Add comment');
        fireEvent.click(addCommentButtons[0]);

        // Comments section should be visible
        await waitFor(() => {
            expect(screen.getByTestId('comments-section-fine-1')).toBeInTheDocument();
            expect(screen.getByText('Comments for Fine fine-1')).toBeInTheDocument();
            expect(screen.getByText('No comments yet')).toBeInTheDocument();
        });

        // Add a comment
        const commentInput = screen.getByTestId('comment-input-fine-1');
        const submitButton = screen.getByTestId('comment-submit-fine-1');

        fireEvent.change(commentInput, { target: { value: 'This fine seems fair' } });
        fireEvent.click(submitButton);

        // Comment should appear
        await waitFor(() => {
            expect(screen.getByText('This fine seems fair')).toBeInTheDocument();
            expect(screen.getByText('user-123:')).toBeInTheDocument();
        });

        // Add another comment
        fireEvent.change(commentInput, { target: { value: 'Agreed, punctuality is important' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Agreed, punctuality is important')).toBeInTheDocument();
        });

        // Both comments should be visible
        expect(screen.getByText('This fine seems fair')).toBeInTheDocument();
        expect(screen.getByText('Agreed, punctuality is important')).toBeInTheDocument();

        // Collapse comments
        fireEvent.click(addCommentButtons[0]);

        await waitFor(() => {
            expect(screen.queryByTestId('comments-section-fine-1')).not.toBeInTheDocument();
        });

        // Comments should be hidden but fine should still be visible
        expect(screen.getByText(/Late to practice/)).toBeInTheDocument();
        expect(screen.queryByText('This fine seems fair')).not.toBeInTheDocument();
    });

    it('should handle multiple fines with independent comment sections', async () => {
        render(<FinesSlackInterface refreshKey={0} />);

        await waitFor(() => {
            expect(screen.getByText(/Late to practice/)).toBeInTheDocument();
            expect(screen.getByText(/Great performance/)).toBeInTheDocument();
        });

        // Expand comments for both fines
        const addCommentButtons = screen.getAllByText('Add comment');
        fireEvent.click(addCommentButtons[0]); // First fine
        fireEvent.click(addCommentButtons[1]); // Second fine

        await waitFor(() => {
            expect(screen.getByTestId('comments-section-fine-1')).toBeInTheDocument();
            expect(screen.getByTestId('comments-section-fine-2')).toBeInTheDocument();
        });

        // Add comments to both fines
        const input1 = screen.getByTestId('comment-input-fine-1');
        const submit1 = screen.getByTestId('comment-submit-fine-1');
        const input2 = screen.getByTestId('comment-input-fine-2');
        const submit2 = screen.getByTestId('comment-submit-fine-2');

        // Comment on first fine
        fireEvent.change(input1, { target: { value: 'Comment on fine 1' } });
        fireEvent.click(submit1);

        // Comment on second fine
        fireEvent.change(input2, { target: { value: 'Comment on fine 2' } });
        fireEvent.click(submit2);

        await waitFor(() => {
            expect(screen.getByText('Comment on fine 1')).toBeInTheDocument();
            expect(screen.getByText('Comment on fine 2')).toBeInTheDocument();
        });

        // Each comment should be in its respective section
        const section1 = screen.getByTestId('comments-section-fine-1');
        const section2 = screen.getByTestId('comments-section-fine-2');

        expect(section1).toContainElement(screen.getByText('Comment on fine 1'));
        expect(section2).toContainElement(screen.getByText('Comment on fine 2'));
    });

    it('should show visual feedback for fines with comments', async () => {
        render(<FinesSlackInterface refreshKey={0} />);

        await waitFor(() => {
            expect(screen.getByText(/Late to practice/)).toBeInTheDocument();
        });

        // Expand comments and add one
        const addCommentButton = screen.getAllByText('Add comment')[0];
        fireEvent.click(addCommentButton);

        await waitFor(() => {
            expect(screen.getByTestId('comments-section-fine-1')).toBeInTheDocument();
        });

        const commentInput = screen.getByTestId('comment-input-fine-1');
        const submitButton = screen.getByTestId('comment-submit-fine-1');

        fireEvent.change(commentInput, { target: { value: 'Test comment' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Test comment')).toBeInTheDocument();
        });

        // The fine row should have visual indication of expanded comments
        const fineRow = screen.getByText(/Late to practice/).closest('.group');
        expect(fineRow).toHaveClass('bg-blue-50');
    });

    it('should reset comment input when toggling visibility', async () => {
        render(<FinesSlackInterface refreshKey={0} />);

        await waitFor(() => {
            expect(screen.getByText(/Late to practice/)).toBeInTheDocument();
        });

        // Expand and add comment
        const addCommentButton = screen.getAllByText('Add comment')[0];
        fireEvent.click(addCommentButton);

        await waitFor(() => {
            expect(screen.getByTestId('comments-section-fine-1')).toBeInTheDocument();
        });

        const commentInput = screen.getByTestId('comment-input-fine-1');
        const submitButton = screen.getByTestId('comment-submit-fine-1');

        fireEvent.change(commentInput, { target: { value: 'Test comment' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Test comment')).toBeInTheDocument();
        });

        // Collapse comments
        fireEvent.click(addCommentButton);

        await waitFor(() => {
            expect(screen.queryByTestId('comments-section-fine-1')).not.toBeInTheDocument();
        });

        // Expand again - in real app, comments would be loaded from database
        fireEvent.click(addCommentButton);

        await waitFor(() => {
            expect(screen.getByTestId('comments-section-fine-1')).toBeInTheDocument();
            // Fresh component instance starts with no comments (would load from DB in real app)
            expect(screen.getByText('No comments yet')).toBeInTheDocument();
        });
    });
});