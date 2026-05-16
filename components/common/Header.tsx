"use client";

import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import logo from "@/assets/wetalk_logo.png";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export default function Header() {
    const { user, logout } = useAuth();
    const initial = user?.firstName?.charAt(0).toUpperCase() || "?";

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0a1a]">
            <Link href="/" className="flex items-center gap-2">
                <Image src={logo} alt="WeTalk Logo" height={56} className="h-12 w-auto object-contain" />
            </Link>
            <div className="relative" ref={menuRef}>
                <div
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 overflow-hidden"
                >
                    {user?.avatar ? (
                        <Image
                            src={user.avatar}
                            alt="User avatar"
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                            unoptimized
                        />
                    ) : (
                        <span className="text-sm font-medium">{initial}</span>
                    )}
                </div>

                {/* Dropdown Menu */}
                <div className={`absolute right-0 top-full mt-2 w-64 rounded-xl border border-white/10 bg-[#13132b] p-4 shadow-xl transition-all duration-200 z-50 origin-top-right transform ${isMenuOpen ? "opacity-100 visible scale-100" : "opacity-0 invisible scale-95"}`}>
                    <div className="flex flex-col items-center border-b border-white/10 pb-4">
                        <div className="h-16 w-16 mb-3 flex items-center justify-center rounded-full bg-white/10 overflow-hidden">
                            {user?.avatar ? (
                                <Image
                                    src={user.avatar}
                                    alt="User avatar"
                                    width={64}
                                    height={64}
                                    className="h-full w-full object-cover"
                                    unoptimized
                                />
                            ) : (
                                <span className="text-xl font-medium">{initial}</span>
                            )}
                        </div>
                        <p className="font-semibold text-white truncate w-full text-center">
                            {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-sm text-gray-400 truncate w-full text-center">
                            {user?.email}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-4">
                        <Link
                            href="/profile"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                            </svg>
                            Edit Profile
                        </Link>
                        <button
                            onClick={() => {
                                setIsMenuOpen(false);
                                if (logout) logout();
                            }}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-400/10 hover:text-red-300 w-full text-left"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
