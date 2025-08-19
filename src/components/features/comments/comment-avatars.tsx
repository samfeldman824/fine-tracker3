"use client"

import { useState } from "react";
import type { UserSelect } from "@/types/models";

interface CommentAvatarsProps {
    users: UserSelect[];
    maxVisible?: number;
    size?: "sm" | "md" | "lg";
    showCount?: boolean;
    className?: string;
}

/**
 * Generates avatar initials from a name
 */
function generateAvatar(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

/**
 * Gets a consistent color for an avatar based on the name
 */
function getAvatarColor(name: string): string {
    const colors = [
        'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
        'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

/**
 * Gets the size classes for the avatar
 */
function getSizeClasses(size: "sm" | "md" | "lg"): string {
    switch (size) {
        case "sm":
            return "w-6 h-6 text-xs";
        case "md":
            return "w-8 h-8 text-sm";
        case "lg":
            return "w-10 h-10 text-base";
        default:
            return "w-8 h-8 text-sm";
    }
}

export function CommentAvatars({
    users,
    maxVisible = 3,
    size = "md",
    showCount = true,
    className = ""
}: CommentAvatarsProps) {
    const [showAll, setShowAll] = useState(false);
    
    if (!users || users.length === 0) {
        return null;
    }

    const visibleUsers = showAll ? users : users.slice(0, maxVisible);
    const hiddenCount = users.length - maxVisible;
    const sizeClasses = getSizeClasses(size);

    return (
        <div className={`flex items-center space-x-1 ${className}`}>
            {/* Visible user avatars */}
            {visibleUsers.map((user, index) => {
                const avatarColor = getAvatarColor(user.name);
                const avatarInitials = generateAvatar(user.name);
                
                return (
                    <div
                        key={user.user_id}
                        className={`${sizeClasses} rounded-lg ${avatarColor} flex items-center justify-center text-white font-semibold flex-shrink-0 border-2 border-white shadow-sm`}
                        style={{
                            zIndex: visibleUsers.length - index,
                            marginLeft: index > 0 ? '-4px' : '0'
                        }}
                        title={user.name}
                    >
                        {avatarInitials}
                    </div>
                );
            })}
            
            {/* Show more indicator */}
            {!showAll && hiddenCount > 0 && (
                <button
                    onClick={() => setShowAll(true)}
                    className={`${sizeClasses} rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0 border-2 border-white shadow-sm transition-colors`}
                    style={{
                        zIndex: 0,
                        marginLeft: '-4px'
                    }}
                    title={`${hiddenCount} more participants`}
                >
                    +{hiddenCount}
                </button>
            )}
            
            {/* Show less button when expanded */}
            {showAll && users.length > maxVisible && (
                <button
                    onClick={() => setShowAll(false)}
                    className={`${sizeClasses} rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0 border-2 border-white shadow-sm transition-colors`}
                    style={{
                        zIndex: 0,
                        marginLeft: '-4px'
                    }}
                    title="Show less"
                >
                    −
                </button>
            )}
        </div>
    );
}
