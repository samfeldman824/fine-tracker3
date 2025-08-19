"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class CommentErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo
        });

        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Comment Error Boundary caught an error:', error, errorInfo);
        }

        // Call optional error handler
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                        <h3 className="text-lg font-semibold text-red-800">
                            Something went wrong
                        </h3>
                    </div>
                    
                    <p className="text-red-700 text-center mb-4 max-w-md">
                        There was an error loading the comments. This might be due to a network issue or a temporary problem.
                    </p>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-sm text-red-800 max-w-full overflow-auto">
                            <summary className="cursor-pointer font-medium">Error Details (Development)</summary>
                            <pre className="mt-2 whitespace-pre-wrap">
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}

                    <Button
                        onClick={this.handleRetry}
                        variant="outline"
                        className="flex items-center space-x-2 border-red-300 text-red-700 hover:bg-red-100"
                    >
                        <RefreshCw className="h-4 w-4" />
                        <span>Try Again</span>
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

// Higher-order component for easier usage
export function withCommentErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: ReactNode
) {
    return function WrappedComponent(props: P) {
        return (
            <CommentErrorBoundary fallback={fallback}>
                <Component {...props} />
            </CommentErrorBoundary>
        );
    };
}

// Hook for error reporting
export function useErrorReporting() {
    const reportError = (error: Error, context?: string) => {
        console.error(`Comment Error${context ? ` (${context})` : ''}:`, error);
        
        // In production, you might want to send errors to a logging service
        if (process.env.NODE_ENV === 'production') {
            // Example: Send to error tracking service
            // errorTrackingService.captureException(error, { context });
        }
    };

    return { reportError };
}