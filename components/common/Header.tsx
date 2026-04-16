"use client";

import { useAuth } from "@/hooks/useAuth";
import Image from "next/image"; // Nên dùng next/image để tối ưu ảnh

export default function Header() {
    const { user } = useAuth();
    const initial = user?.firstName?.charAt(0).toUpperCase() || "?";

    return (
        <header className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">WeTalk</h2>
            </div>
            <button
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
            </button>
        </header>
    );
}
