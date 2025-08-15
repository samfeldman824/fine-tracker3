"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button"


type HeaderProps = {
    username: string;
    role?: string;
};

export default function Header({ username, role }: HeaderProps) {
    return (
        <header className="bg-[#3b2a22] text-white shadow-md w-full">
            <div className="mx-auto flex items-center justify-between px-6 py-4">
                {/* Left: Title */}
                <h1 className="text-2xl font-bold">
                    BMT Fines 2025-2026
                </h1>

                {/* Middle: Navigation */}
                <nav className="flex gap-4">
                    <Link
                        href="/fines"
                        className="rounded-md bg-[#7d6c64] px-4 py-2 font-semibold shadow hover:opacity-90"
                    >
                        Fines
                    </Link>
                    <Link
                        href="/totals"
                        className="rounded-md bg-[#7d6c64] px-4 py-2 font-semibold shadow hover:opacity-90"
                    >
                        Totals
                    </Link>
                </nav>

                {/* Right: User Info + Logout */}
                <div className="flex items-center gap-4 rounded-md bg-[#6b4a41] px-4 py-2">
                    <span className="font-semibold">
                        {username} {role ? `(${role})` : ""}
                    </span>
                    <button
                        className="rounded-md bg-white px-4 py-2 font-bold text-[#5b3a32] shadow hover:bg-gray-100"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
}
