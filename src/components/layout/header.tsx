"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";


type HeaderProps = {
    username: string;
    role?: string;
};

export default function Header({ username, role }: HeaderProps) {
    const { logout } = useAuth();
    
    return (
        <header className="bg-gradient-to-r from-[#3b2a22] to-[#4a3528] text-white shadow-lg border-b border-[#2a1a12]">
            <div className="mx-auto flex items-center justify-between px-6 py-4 max-w-7xl">
                {/* Left: Title */}
                <h1 className="text-2xl font-bold tracking-tight">
                    BMT Fines 2025-2026
                </h1>

                {/* Middle: Navigation */}
                <nav className="flex gap-3">
                    <Link
                        href="/dashboard"
                        className="rounded-lg bg-white/10 px-4 py-2 font-medium shadow-sm hover:bg-white/20 transition-colors duration-200"
                    >
                        Fines
                    </Link>
                    <Link
                        href="/totals"
                        className="rounded-lg bg-white/10 px-4 py-2 font-medium shadow-sm hover:bg-white/20 transition-colors duration-200"
                    >
                        Totals
                    </Link>
                </nav>

                {/* Right: User Info + Logout */}
                <div className="flex items-center gap-4 rounded-lg bg-white/10 px-4 py-2 backdrop-blur-sm">
                    <span className="font-medium text-sm">
                        {username} {role ? `(${role})` : ""}
                    </span>
                    <button
                        onClick={logout}
                        className="rounded-md bg-white/20 px-4 py-2 font-medium text-white shadow-sm hover:bg-white/30 transition-colors duration-200"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
}
