"use client"

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteCommentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting?: boolean;
    hasReplies?: boolean;
    commentAuthor?: string;
}

export function DeleteCommentDialog({
    isOpen,
    onClose,
    onConfirm,
    isDeleting = false,
    hasReplies = false,
    commentAuthor = "this user"
}: DeleteCommentDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div role="dialog" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description" className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h3 id="delete-dialog-title" className="text-lg font-semibold text-gray-900">
                                Delete Comment
                            </h3>
                            <p id="delete-dialog-description" className="text-sm text-gray-500">
                                This action cannot be undone
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="mb-6">
                        <p className="text-gray-700 mb-3">
                            Are you sure you want to delete {commentAuthor}'s comment?
                        </p>
                        
                        {hasReplies && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                <div className="flex items-start space-x-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-yellow-800">
                                        <p className="font-medium mb-1">This comment has replies</p>
                                        <p>
                                            The comment will be replaced with a "deleted comment" placeholder 
                                            to preserve the conversation thread. Replies will remain visible.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isDeleting}
                            className="px-4 py-2"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Comment
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}