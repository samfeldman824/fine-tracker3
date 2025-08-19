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

// Mock the CommentsSection component
jest.mock('@/components/features/comments', () => ({
    CommentsSection: ({ fineId, currentUserId }: { fineId: string; currentUserId?: string }) => (
        <div data-testid={`comments-section-${fineId}`}>
            <div>Comments for fine {fineId}</div>
            <div>User: {currentUserId}</div>
        </div>
    )
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Mock fine data
const mockFines = [
    {
        id: 'fine-1',
        date: '2025-08-18T10:00:00Z',
        fine_type: 'Fine',
        description: 'Test fine',
        amount: 100,
        replies: 0,
        subject: { name: 'John Doe' },
        proposer: { name: 'Jane Smith' }
    },
    {
        id: 'fine-2',
        date: '2025-08-18T11:00:00Z',
        fine_type: 'Credit',
        description: 'Test credit',
        amount: 50,
        replies: 0,
        subject: { name: 'Bob Wilson' },
        proposer: { name: 'Alice Brown' }
    }
];

describe('FinesSlackInterface - Comments Integration', () => {
    let mockSupabase: any;

    beforeEach(() => {
        // Mock auth user
        mockUseAuth.mockReturnValue({
            user: {
                id: 'user-123',
                name: 'Test User',
                username: 'testuser',
                email: 'test@example.com',
                role: 'user'
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

    it('should render fines with comment indicators', async () => {
        render(<FinesSlackInterface refreshKey={0} />);

        await waitFor(() => {
            expect(screen.getByText(/Test fine/)).toBeInTheDocument();
            expect(screen.getByText(/Test credit/)).toBeInTheDocument();
        });

        // Should show fine messages
        expect(screen.getByText(/Test fine/)).toBeInTheDocument();
        expect(screen.getByText(/Test credit/)).toBeInTheDocument();
    });

    it('should show "Add comment" button for fines without comments', async () => {
        render(<FinesSlackInterface refreshKey={0} />);

        await waitFor(() => {
            expect(screen.getByText(/Test fine/)).toBeInTheDocument();
        });

        // Should show "Add comment" buttons (initially hidden, shown on hover)
        const addCommentButtons = screen.getAllByText('Add comment');
        expect(addCommentButtons.length).toBeGreaterThan(0);
    });

    it('should expand comments section when comment button is clicked', async () => {
        render(<FinesSlackInterface refreshKey={0} />);

        await waitFor(() => {
            expect(screen.getByText(/Test fine/)).toBeInTheDocument();
        });

        // Click on "Add comment" for the first fine
        const addCommentButton = screen.getAllByText('Add comment')[0];
        fireEvent.click(addCommentButton);

        // Should show expanded comments section
        await waitFor(() => {
            expect(screen.getByTestId('comments-section-fine-1')).toBeInTheDocument();
            expect(screen.getByText('Comments for fine fine-1')).toBeInTheDocument();
            expect(screen.getByText('User: user-123')).toBeInTheDocument();
        });
    });

    it('should toggle comments section visibility', async () => {
        render(<FinesSlackInterface refreshKey={0} />);

        await waitFor(() => {
            expect(screen.getByText(/Test fine/)).toBeInTheDocument();
        });

        // Click to expand comments
        const addCommentButton = screen.getAllByText('Add comment')[0];
        fireEvent.click(addCommentButton);

        await waitFor(() => {
            expect(screen.getByTestId('comments-section-fine-1')).toBeInTheDocument();
        });

        // Click again to collapse comments
        fireEvent.click(addCommentButton);

        await waitFor(() => {
            expect(screen.queryByTestId('comments-section-fine-1')).not.toBeInTheDocument();
        });
    });

    it('should show comment count when comments exist', async () => {
        // Mock comment counts
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'comments') {
                return {
                    select: jest.fn(() => ({
                        in: jest.fn(() => ({
                            eq: jest.fn(() => Promise.resolve({ 
                                data: [
                                    { fine_id: 'fine-1' },
                                    { fine_id: 'fine-1' },
                                    { fine_id: 'fine-2' }
                                ], 
                                error: null 
                            }))
                        })),
                        eq: jest.fn(() => ({
                            eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
                        }))
                    }))
                };
            }
            // For fines table
            return {
                select: jest.fn(() => ({
                    order: jest.fn(() => Promise.resolve({ data: mockFines, error: null }))
                }))
            };
        });

        render(<FinesSlackInterface refreshKey={0} />);

        await waitFor(() => {
            expect(screen.getByText(/Test fine/)).toBeInTheDocument();
        });

        // Should show comment counts
        await waitFor(() => {
            expect(screen.getByText('2 comments')).toBeInTheDocument();
            expect(screen.getByText('1 comment')).toBeInTheDocument();
        });
    });

    it('should pass correct props to CommentsSection', async () => {
        render(<FinesSlackInterface refreshKey={0} />);

        await waitFor(() => {
            expect(screen.getByText(/Test fine/)).toBeInTheDocument();
        });

        // Expand comments for first fine
        const addCommentButton = screen.getAllByText('Add comment')[0];
        fireEvent.click(addCommentButton);

        await waitFor(() => {
            const commentsSection = screen.getByTestId('comments-section-fine-1');
            expect(commentsSection).toBeInTheDocument();
            
            // Check that correct props are passed
            expect(screen.getByText('Comments for fine fine-1')).toBeInTheDocument();
            expect(screen.getByText('User: user-123')).toBeInTheDocument();
        });
    });

    it('should handle multiple expanded comment sections', async () => {
        render(<FinesSlackInterface refreshKey={0} />);

        await waitFor(() => {
            expect(screen.getByText(/Test fine/)).toBeInTheDocument();
            expect(screen.getByText(/Test credit/)).toBeInTheDocument();
        });

        // Expand comments for both fines
        const addCommentButtons = screen.getAllByText('Add comment');
        fireEvent.click(addCommentButtons[0]);
        fireEvent.click(addCommentButtons[1]);

        await waitFor(() => {
            expect(screen.getByTestId('comments-section-fine-1')).toBeInTheDocument();
            expect(screen.getByTestId('comments-section-fine-2')).toBeInTheDocument();
        });
    });

    it('should set up real-time subscription for comments', () => {
        render(<FinesSlackInterface refreshKey={0} />);

        // Should set up real-time subscription
        expect(mockSupabase.channel).toHaveBeenCalledWith('comments-changes');
    });
});