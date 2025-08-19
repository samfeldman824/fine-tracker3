"use client"

import React from 'react';
import { Loader2, MessageCircle, AlertCircle } from 'lucide-react';

// Loading spinner component
export function LoadingSpinner({ 
    size = 'default', 
    className = '' 
}: { 
    size?: 'small' | 'default' | 'large';
    className?: string;
}) {
    const sizeClasses = {
        small: 'h-4 w-4',
        default: 'h-6 w-6',
        large: 'h-8 w-8'
    };

    return (
        <Loader2 
            className={`animate-spin ${sizeClasses[size]} ${className}`} 
        />
    );
}

// Comments section loading skeleton
export function CommentsLoadingSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center space-x-2">
                <div className="h-5 w-5 bg-gray-300 rounded"></div>
                <div className="h-6 w-24 bg-gray-300 rounded"></div>
                <div className="h-5 w-8 bg-gray-300 rounded-full"></div>
            </div>

            {/* Comment input skeleton */}
            <div className="bg-gray-100 rounded-lg p-4">
                <div className="h-20 bg-gray-300 rounded mb-3"></div>
                <div className="flex justify-between items-center">
                    <div className="h-4 w-32 bg-gray-300 rounded"></div>
                    <div className="h-8 w-20 bg-gray-300 rounded"></div>
                </div>
            </div>

            {/* Comment items skeleton */}
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-lg p-4">
                    <div className="flex space-x-3">
                        {/* Avatar skeleton */}
                        <div className="w-8 h-8 bg-gray-300 rounded-lg flex-shrink-0"></div>
                        
                        <div className="flex-1 space-y-2">
                            {/* Header skeleton */}
                            <div className="flex items-center space-x-2">
                                <div className="h-4 w-20 bg-gray-300 rounded"></div>
                                <div className="h-3 w-16 bg-gray-300 rounded"></div>
                            </div>
                            
                            {/* Content skeleton */}
                            <div className="space-y-1">
                                <div className="h-4 w-full bg-gray-300 rounded"></div>
                                <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
                            </div>
                            
                            {/* Actions skeleton */}
                            <div className="flex space-x-2 mt-2">
                                <div className="h-6 w-12 bg-gray-300 rounded"></div>
                                <div className="h-6 w-12 bg-gray-300 rounded"></div>
                                <div className="h-6 w-16 bg-gray-300 rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Individual comment loading skeleton
export function CommentItemSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-lg flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                        <div className="h-4 w-20 bg-gray-300 rounded"></div>
                        <div className="h-3 w-16 bg-gray-300 rounded"></div>
                    </div>
                    <div className="space-y-1">
                        <div className="h-4 w-full bg-gray-300 rounded"></div>
                        <div className="h-4 w-2/3 bg-gray-300 rounded"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Loading overlay for operations
export function LoadingOverlay({ 
    message = 'Loading...', 
    isVisible = true 
}: { 
    message?: string;
    isVisible?: boolean;
}) {
    if (!isVisible) return null;

    return (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
            <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-lg border">
                <LoadingSpinner size="default" className="text-blue-600" />
                <span className="text-gray-700 font-medium">{message}</span>
            </div>
        </div>
    );
}

// Inline loading state for buttons
export function ButtonLoadingState({ 
    isLoading = false, 
    loadingText = 'Loading...', 
    children 
}: { 
    isLoading?: boolean;
    loadingText?: string;
    children: React.ReactNode;
}) {
    if (isLoading) {
        return (
            <div className="flex items-center space-x-2">
                <LoadingSpinner size="small" />
                <span>{loadingText}</span>
            </div>
        );
    }

    return <>{children}</>;
}

// Empty state component
export function CommentsEmptyState({ 
    title = 'No comments yet',
    description = 'Be the first to share your thoughts on this fine.',
    icon: Icon = MessageCircle
}: {
    title?: string;
    description?: string;
    icon?: React.ComponentType<{ className?: string }>;
}) {
    return (
        <div className="text-center py-12">
            <Icon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
                {title}
            </h4>
            <p className="text-gray-500">
                {description}
            </p>
        </div>
    );
}

// Error state component
export function CommentsErrorState({ 
    title = 'Failed to load comments',
    description = 'There was an error loading the comments. Please try again.',
    onRetry,
    showRetry = true
}: {
    title?: string;
    description?: string;
    onRetry?: () => void;
    showRetry?: boolean;
}) {
    return (
        <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
                {title}
            </h4>
            <p className="text-gray-500 mb-4">
                {description}
            </p>
            {showRetry && onRetry && (
                <button
                    onClick={onRetry}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <LoadingSpinner size="small" className="mr-2" />
                    Try Again
                </button>
            )}
        </div>
    );
}

// Network status indicator
export function NetworkStatusIndicator({ 
    isOnline = true,
    className = ''
}: {
    isOnline?: boolean;
    className?: string;
}) {
    if (isOnline) return null;

    return (
        <div className={`flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 ${className}`}>
            <AlertCircle className="h-4 w-4" />
            <span>You&apos;re offline. Comments may not sync until you&apos;re back online.</span>
        </div>
    );
}