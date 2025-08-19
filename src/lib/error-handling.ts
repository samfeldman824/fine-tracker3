/**
 * Error handling utilities for the comments system
 */

export type ErrorType = 
    | 'network'
    | 'validation' 
    | 'authentication'
    | 'authorization'
    | 'not_found'
    | 'rate_limit'
    | 'server_error'
    | 'unknown';

export interface AppError extends Error {
    type: ErrorType;
    code?: string;
    statusCode?: number;
    retryable?: boolean;
    userMessage?: string;
    context?: Record<string, any>;
}

/**
 * Creates a standardized application error
 */
export function createAppError(
    message: string,
    type: ErrorType = 'unknown',
    options: Partial<AppError> = {}
): AppError {
    const error = new Error(message) as AppError;
    error.type = type;
    error.code = options.code;
    error.statusCode = options.statusCode;
    error.retryable = options.retryable ?? isRetryableError(type);
    error.userMessage = options.userMessage ?? getUserFriendlyMessage(type, message);
    error.context = options.context;
    
    return error;
}

/**
 * Determines if an error type is retryable
 */
export function isRetryableError(type: ErrorType): boolean {
    switch (type) {
        case 'network':
        case 'server_error':
            return true;
        case 'validation':
        case 'authentication':
        case 'authorization':
        case 'not_found':
        case 'rate_limit':
            return false;
        default:
            return false;
    }
}

/**
 * Gets user-friendly error messages
 */
export function getUserFriendlyMessage(type: ErrorType, originalMessage: string): string {
    switch (type) {
        case 'network':
            return 'Unable to connect. Please check your internet connection and try again.';
        case 'validation':
            return 'Please check your input and try again.';
        case 'authentication':
            return 'You need to be logged in to perform this action.';
        case 'authorization':
            return 'You don\'t have permission to perform this action.';
        case 'not_found':
            return 'The requested item could not be found.';
        case 'rate_limit':
            return 'Too many requests. Please wait a moment and try again.';
        case 'server_error':
            return 'Something went wrong on our end. Please try again in a moment.';
        default:
            return originalMessage || 'An unexpected error occurred.';
    }
}

/**
 * Parses Supabase errors into standardized app errors
 */
export function parseSupabaseError(error: any): AppError {
    if (!error) {
        return createAppError('Unknown error occurred', 'unknown');
    }

    // Handle Supabase PostgreSQL errors
    if (error.code) {
        switch (error.code) {
            case '23505': // unique_violation
                return createAppError(
                    'Duplicate entry',
                    'validation',
                    { 
                        code: error.code,
                        userMessage: 'This item already exists.'
                    }
                );
            case '23503': // foreign_key_violation
                return createAppError(
                    'Referenced item not found',
                    'validation',
                    { 
                        code: error.code,
                        userMessage: 'The referenced item no longer exists.'
                    }
                );
            case '23514': // check_violation
                return createAppError(
                    'Invalid data',
                    'validation',
                    { 
                        code: error.code,
                        userMessage: 'The provided data is invalid.'
                    }
                );
            case 'PGRST116': // No rows found
                return createAppError(
                    'Item not found',
                    'not_found',
                    { 
                        code: error.code,
                        userMessage: 'The requested item could not be found.'
                    }
                );
        }
    }

    // Handle HTTP status codes
    if (error.status || error.statusCode) {
        const status = error.status || error.statusCode;
        switch (status) {
            case 400:
                return createAppError(
                    error.message || 'Bad request',
                    'validation',
                    { statusCode: status }
                );
            case 401:
                return createAppError(
                    error.message || 'Unauthorized',
                    'authentication',
                    { statusCode: status }
                );
            case 403:
                return createAppError(
                    error.message || 'Forbidden',
                    'authorization',
                    { statusCode: status }
                );
            case 404:
                return createAppError(
                    error.message || 'Not found',
                    'not_found',
                    { statusCode: status }
                );
            case 429:
                return createAppError(
                    error.message || 'Too many requests',
                    'rate_limit',
                    { statusCode: status }
                );
            case 500:
            case 502:
            case 503:
            case 504:
                return createAppError(
                    error.message || 'Server error',
                    'server_error',
                    { statusCode: status }
                );
        }
    }

    // Handle network errors
    if (error.message && (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('connection') ||
        error.message.includes('timeout')
    )) {
        return createAppError(
            error.message,
            'network',
            { retryable: true }
        );
    }

    // Default to unknown error
    return createAppError(
        error.message || 'An unexpected error occurred',
        'unknown',
        { context: { originalError: error } }
    );
}

/**
 * Error recovery strategies
 */
export interface RecoveryStrategy {
    canRecover: boolean;
    action?: () => void | Promise<void>;
    actionLabel?: string;
    message?: string;
}

export function getRecoveryStrategy(error: AppError): RecoveryStrategy {
    switch (error.type) {
        case 'network':
            return {
                canRecover: true,
                actionLabel: 'Retry',
                message: 'Check your connection and try again.'
            };
        case 'authentication':
            return {
                canRecover: true,
                actionLabel: 'Sign In',
                message: 'Please sign in to continue.'
            };
        case 'server_error':
            return {
                canRecover: true,
                actionLabel: 'Retry',
                message: 'This might be a temporary issue.'
            };
        case 'rate_limit':
            return {
                canRecover: true,
                message: 'Please wait a moment before trying again.'
            };
        default:
            return {
                canRecover: false,
                message: 'Please refresh the page or contact support if the problem persists.'
            };
    }
}

/**
 * Logs errors with appropriate level and context
 */
export function logError(error: AppError, context?: Record<string, any>) {
    const logData = {
        message: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        retryable: error.retryable,
        stack: error.stack,
        context: { ...error.context, ...context },
        timestamp: new Date().toISOString()
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
        console.error('App Error:', logData);
    }

    // In production, you might want to send to an error tracking service
    if (process.env.NODE_ENV === 'production') {
        // Example: Send to error tracking service
        // errorTrackingService.captureException(error, { extra: logData });
    }
}

/**
 * Hook for centralized error handling
 */
export function useErrorHandler() {
    const handleError = (error: any, context?: Record<string, any>) => {
        const appError = error instanceof Error && 'type' in error 
            ? error as AppError
            : parseSupabaseError(error);

        logError(appError, context);
        return appError;
    };

    return { handleError };
}