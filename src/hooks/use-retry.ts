"use client"

import { useState, useCallback, useRef } from 'react';

export interface RetryOptions {
    maxAttempts?: number;
    delay?: number;
    backoffMultiplier?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
    onMaxAttemptsReached?: (error: Error) => void;
}

export interface RetryState {
    isRetrying: boolean;
    attempt: number;
    lastError: Error | null;
    canRetry: boolean;
}

export function useRetry(options: RetryOptions = {}) {
    const {
        maxAttempts = 3,
        delay = 1000,
        backoffMultiplier = 2,
        maxDelay = 10000,
        onRetry,
        onMaxAttemptsReached
    } = options;

    const [retryState, setRetryState] = useState<RetryState>({
        isRetrying: false,
        attempt: 0,
        lastError: null,
        canRetry: true
    });

    const timeoutRef = useRef<NodeJS.Timeout>();

    const calculateDelay = (attempt: number): number => {
        const calculatedDelay = delay * Math.pow(backoffMultiplier, attempt - 1);
        return Math.min(calculatedDelay, maxDelay);
    };

    const executeWithRetry = useCallback(async <T>(
        operation: () => Promise<T>
    ): Promise<T> => {
        let currentAttempt = 0;
        let lastError: Error;

        while (currentAttempt < maxAttempts) {
            currentAttempt++;
            
            setRetryState(prev => ({
                ...prev,
                isRetrying: currentAttempt > 1,
                attempt: currentAttempt,
                canRetry: currentAttempt < maxAttempts
            }));

            try {
                const result = await operation();
                
                // Success - reset state
                setRetryState({
                    isRetrying: false,
                    attempt: 0,
                    lastError: null,
                    canRetry: true
                });

                return result;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                setRetryState(prev => ({
                    ...prev,
                    lastError,
                    canRetry: currentAttempt < maxAttempts
                }));

                if (currentAttempt < maxAttempts) {
                    // Call retry callback
                    if (onRetry) {
                        onRetry(currentAttempt, lastError);
                    }

                    // Wait before retrying
                    const retryDelay = calculateDelay(currentAttempt);
                    await new Promise(resolve => {
                        timeoutRef.current = setTimeout(resolve, retryDelay);
                    });
                } else {
                    // Max attempts reached
                    if (onMaxAttemptsReached) {
                        onMaxAttemptsReached(lastError);
                    }
                }
            }
        }

        setRetryState(prev => ({
            ...prev,
            isRetrying: false,
            canRetry: false
        }));

        throw lastError!;
    }, [maxAttempts, delay, backoffMultiplier, maxDelay, onRetry, onMaxAttemptsReached]);

    const reset = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        setRetryState({
            isRetrying: false,
            attempt: 0,
            lastError: null,
            canRetry: true
        });
    }, []);

    const manualRetry = useCallback(async <T>(
        operation: () => Promise<T>
    ): Promise<T> => {
        reset();
        return executeWithRetry(operation);
    }, [reset, executeWithRetry]);

    return {
        executeWithRetry,
        manualRetry,
        reset,
        ...retryState
    };
}

// Specialized hook for API operations
export function useApiRetry(options: RetryOptions = {}) {
    const defaultOptions: RetryOptions = {
        maxAttempts: 3,
        delay: 1000,
        backoffMultiplier: 1.5,
        maxDelay: 5000,
        onRetry: (attempt, error) => {
            console.warn(`API retry attempt ${attempt}:`, error.message);
        },
        onMaxAttemptsReached: (error) => {
            console.error('API max retry attempts reached:', error.message);
        },
        ...options
    };

    return useRetry(defaultOptions);
}

// Hook for network-aware operations
export function useNetworkRetry(options: RetryOptions = {}) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

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

    const networkAwareOptions: RetryOptions = {
        ...options,
        onRetry: (attempt, error) => {
            if (!isOnline) {
                console.warn('Network retry skipped - offline');
                return;
            }
            options.onRetry?.(attempt, error);
        }
    };

    const retry = useRetry(networkAwareOptions);

    return {
        ...retry,
        isOnline
    };
}