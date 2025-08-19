"use client"

import { CommentAvatars } from "./comment-avatars";
import type { UserSelect } from "@/types/models";

interface DebugAvatarsProps {
    className?: string;
}

export function DebugAvatars({ className = "" }: DebugAvatarsProps) {
    // Test data to verify the component works
    const testUsers: UserSelect[] = [
        { user_id: "1", username: "john", name: "John Doe" },
        { user_id: "2", username: "jane", name: "Jane Smith" },
        { user_id: "3", username: "bob", name: "Bob Johnson" },
        { user_id: "4", username: "alice", name: "Alice Brown" },
    ];

    return (
        <div className={`p-4 border border-blue-300 bg-blue-50 rounded-lg ${className}`}>
            <h3 className="text-lg font-semibold mb-2">Debug: Comment Avatars Test</h3>
            <p className="text-sm text-gray-600 mb-4">
                This is a test to verify the CommentAvatars component works correctly.
            </p>
            
            <div className="space-y-4">
                <div>
                    <h4 className="font-medium mb-2">Test with 2 users:</h4>
                    <CommentAvatars users={testUsers.slice(0, 2)} size="md" />
                </div>
                
                <div>
                    <h4 className="font-medium mb-2">Test with 3 users:</h4>
                    <CommentAvatars users={testUsers.slice(0, 3)} size="md" />
                </div>
                
                <div>
                    <h4 className="font-medium mb-2">Test with 4 users (should show +1):</h4>
                    <CommentAvatars users={testUsers} size="md" />
                </div>
                
                <div>
                    <h4 className="font-medium mb-2">Small size:</h4>
                    <CommentAvatars users={testUsers.slice(0, 3)} size="sm" />
                </div>
            </div>
        </div>
    );
}
