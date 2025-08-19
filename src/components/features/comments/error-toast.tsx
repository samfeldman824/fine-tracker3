"use client"

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastProps {
    toast: Toast;
    onDismiss: (id: string) => void;
}

const toastIcons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
};

const toastStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
};

const iconStyles = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600'
};

function ToastItem({ toast, onDismiss }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);
    const Icon = toastIcons[toast.type];

    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => onDismiss(toast.id), 300);
            }, toast.duration);

            return () => clearTimeout(timer);
        }
    }, [toast.duration, toast.id, onDismiss]);

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(() => onDismiss(toast.id), 300);
    };

    return (
        <div
            className={`
                transform transition-all duration-300 ease-in-out
                ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
                max-w-sm w-full border rounded-lg shadow-lg p-4 mb-3
                ${toastStyles[toast.type]}
            `}
        >
            <div className="flex items-start space-x-3">
                <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconStyles[toast.type]}`} />
                
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">
                        {toast.title}
                    </h4>
                    {toast.message && (
                        <p className="text-sm mt-1 opacity-90">
                            {toast.message}
                        </p>
                    )}
                    {toast.action && (
                        <div className="mt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={toast.action.onClick}
                                className="text-xs h-7 px-2"
                            >
                                {toast.action.label}
                            </Button>
                        </div>
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

interface ToastContainerProps {
    toasts: Toast[];
    onDismiss: (id: string) => void;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
};

export function ToastContainer({ 
    toasts, 
    onDismiss, 
    position = 'top-right' 
}: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className={`fixed z-50 ${positionStyles[position]}`}>
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onDismiss={onDismiss}
                />
            ))}
        </div>
    );
}

// Hook for managing toasts
export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = (toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const newToast: Toast = {
            id,
            duration: 5000, // Default 5 seconds
            ...toast
        };

        setToasts(prev => [...prev, newToast]);
        return id;
    };

    const dismissToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const dismissAll = () => {
        setToasts([]);
    };

    // Convenience methods
    const success = (title: string, message?: string, options?: Partial<Toast>) => 
        addToast({ type: 'success', title, message, ...options });

    const error = (title: string, message?: string, options?: Partial<Toast>) => 
        addToast({ type: 'error', title, message, duration: 0, ...options }); // Errors don't auto-dismiss

    const warning = (title: string, message?: string, options?: Partial<Toast>) => 
        addToast({ type: 'warning', title, message, ...options });

    const info = (title: string, message?: string, options?: Partial<Toast>) => 
        addToast({ type: 'info', title, message, ...options });

    return {
        toasts,
        addToast,
        dismissToast,
        dismissAll,
        success,
        error,
        warning,
        info
    };
}