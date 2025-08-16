"use client";

import { LoadingState } from "@/types/common";

interface LoadingSpinnerProps {
  state: LoadingState;
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ 
  state, 
  message = "Loading...", 
  size = "md" 
}: LoadingSpinnerProps) {
  if (state === "idle" || state === "success") {
    return null;
  }

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex items-center space-x-2">
        <div className={`animate-spin rounded-full border-2 border-[#7d6c64] border-t-transparent ${sizeClasses[size]}`} />
        <span className="text-[#3b2a22] font-medium">{message}</span>
      </div>
    </div>
  );
}
