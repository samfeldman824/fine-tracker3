import { parseSupabaseError, createAppError, getUserFriendlyMessage, isRetryableError } from '@/lib/error-handling';

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

// Focus on testing the error handling utilities directly

describe('Error Handling Utilities', () => {
    describe('parseSupabaseError', () => {
        it('should parse network errors correctly', () => {
            const networkError = new Error('fetch failed');
            const result = parseSupabaseError(networkError);
            
            expect(result.type).toBe('network');
            expect(result.retryable).toBe(true);
            expect(result.userMessage).toContain('connection');
        });

        it('should parse authentication errors correctly', () => {
            const authError = { status: 401, message: 'Unauthorized' };
            const result = parseSupabaseError(authError);
            
            expect(result.type).toBe('authentication');
            expect(result.statusCode).toBe(401);
            expect(result.retryable).toBe(false);
        });

        it('should parse validation errors correctly', () => {
            const validationError = { status: 400, message: 'Bad request' };
            const result = parseSupabaseError(validationError);
            
            expect(result.type).toBe('validation');
            expect(result.statusCode).toBe(400);
            expect(result.retryable).toBe(false);
        });

        it('should parse server errors correctly', () => {
            const serverError = { status: 500, message: 'Internal server error' };
            const result = parseSupabaseError(serverError);
            
            expect(result.type).toBe('server_error');
            expect(result.statusCode).toBe(500);
            expect(result.retryable).toBe(true);
        });

        it('should handle PostgreSQL constraint violations', () => {
            const constraintError = { code: '23505', message: 'duplicate key value' };
            const result = parseSupabaseError(constraintError);
            
            expect(result.type).toBe('validation');
            expect(result.code).toBe('23505');
            expect(result.userMessage).toContain('already exists');
        });
    });

    describe('createAppError', () => {
        it('should create error with correct properties', () => {
            const error = createAppError('Test error', 'network', {
                code: 'NET001',
                statusCode: 500
            });

            expect(error.message).toBe('Test error');
            expect(error.type).toBe('network');
            expect(error.code).toBe('NET001');
            expect(error.statusCode).toBe(500);
            expect(error.retryable).toBe(true);
        });

        it('should set default retryable based on error type', () => {
            const networkError = createAppError('Network error', 'network');
            const validationError = createAppError('Validation error', 'validation');

            expect(networkError.retryable).toBe(true);
            expect(validationError.retryable).toBe(false);
        });
    });

    describe('isRetryableError', () => {
        it('should correctly identify retryable errors', () => {
            expect(isRetryableError('network')).toBe(true);
            expect(isRetryableError('server_error')).toBe(true);
            expect(isRetryableError('validation')).toBe(false);
            expect(isRetryableError('authentication')).toBe(false);
            expect(isRetryableError('authorization')).toBe(false);
        });
    });

    describe('getUserFriendlyMessage', () => {
        it('should return user-friendly messages for different error types', () => {
            expect(getUserFriendlyMessage('network', 'fetch failed')).toContain('connection');
            expect(getUserFriendlyMessage('authentication', 'unauthorized')).toContain('logged in');
            expect(getUserFriendlyMessage('validation', 'bad input')).toContain('input');
            expect(getUserFriendlyMessage('server_error', 'internal error')).toContain('our end');
        });

        it('should fallback to original message for unknown types', () => {
            expect(getUserFriendlyMessage('unknown' as any, 'original message')).toBe('original message');
        });
    });

});