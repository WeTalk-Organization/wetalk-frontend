"use client";

import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import logo from "@/assets/images/wetalk_logo.png";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";
import { notificationService, Notification } from "@/services/notification.service";
import { Bell, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "@/utils/date";

const PAGE_LIMIT = 5;

export default function Header() {
    const { user, logout } = useAuth();
    const initial = user?.firstName?.charAt(0).toUpperCase() || "?";

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    // Track current notifications length for use inside loadPage without stale closure
    const notifLenRef = useRef(0);

    const { socket } = useSocket();

    // Keep ref in sync
    useEffect(() => {
        notifLenRef.current = notifications.length;
    }, [notifications.length]);

    // Fetch unread count on mount
    useEffect(() => {
        if (!user) return;
        const fetchUnreadCount = async () => {
            try {
                const response = await notificationService.getUnreadCount();
                setUnreadCount(response.data.count);
            } catch (error) {
                console.error("Failed to fetch unread count:", error);
            }
        };
        fetchUnreadCount();
    }, [user]);

    // Load a page of notifications from backend
    const loadPage = useCallback(async (pageNum: number, replace: boolean = false) => {
        if (pageNum === 1) setIsInitialLoading(true);
        else setIsLoadingMore(true);

        try {
            const response = await notificationService.getNotifications(pageNum, PAGE_LIMIT);
            const { data, total } = response.data;

            setNotifications((prev) => replace ? data : [...prev, ...data]);
            setPage(pageNum);

            const loadedSoFar = replace ? data.length : notifLenRef.current + data.length;
            setHasMore(loadedSoFar < total);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setIsInitialLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    // Listen to real-time notification events
    useEffect(() => {
        if (!socket || !user) return;

        const handleNewFollower = (payload: { actorName: string; notificationId: string; createdAt?: string; actorId: string; actorPicture?: string }) => {
            const parts = payload.actorName.split(" ");
            const firstName = parts[0] || "";
            const lastName = parts.slice(1).join(" ") || "";

            const newNotif: Notification = {
                id: payload.notificationId,
                type: "follow",
                isRead: false,
                createdAt: payload.createdAt || new Date().toISOString(),
                actor: {
                    id: payload.actorId,
                    firstName,
                    lastName,
                    picture: payload.actorPicture,
                },
            };

            setNotifications((prev) => [newNotif, ...prev]);

            if (isNotifOpen) {
                notificationService.markAllAsRead().catch((err) => console.error(err));
            } else {
                setUnreadCount((prev) => prev + 1);
            }
        };

        socket.on("you-have-a-new-follower", handleNewFollower);
        return () => { socket.off("you-have-a-new-follower", handleNewFollower); };
    }, [socket, user, isNotifOpen]);

    // Click outside closes dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, []);

    // Infinite scroll: detect when list is scrolled near bottom
    useEffect(() => {
        const listEl = listRef.current;
        if (!listEl) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = listEl;
            if (scrollHeight - scrollTop - clientHeight < 60 && hasMore && !isLoadingMore && !isInitialLoading) {
                loadPage(page + 1);
            }
        };

        listEl.addEventListener("scroll", handleScroll);
        return () => { listEl.removeEventListener("scroll", handleScroll); };
    }, [hasMore, isLoadingMore, isInitialLoading, page, loadPage]);

    const handleToggleNotif = async () => {
        const nextState = !isNotifOpen;
        setIsNotifOpen(nextState);

        if (nextState) {
            // Reset and load first page fresh
            setNotifications([]);
            notifLenRef.current = 0;
            setPage(1);
            setHasMore(true);
            setUnreadCount(0);
            await loadPage(1, true);
            notificationService.markAllAsRead().catch((err) => console.error(err));
        }
    };

    return (
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0a1a]">
            <Link href="/" className="flex items-center gap-2">
                <Image src={logo} alt="WeTalk Logo" height={56} className="h-12 w-auto object-contain" />
            </Link>

            <div className="flex items-center gap-4">
                {/* Notification Dropdown */}
                {user && (
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={handleToggleNotif}
                            className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-violet-600"
                        >
                            <Bell className="w-5 h-5 text-gray-300 hover:text-white transition-colors" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-[0_0_8px_#ef4444] border border-[#0a0a1a]">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notifications Dropdown Panel */}
                        <div className={`absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/10 bg-[#13132b]/95 backdrop-blur-md p-4 shadow-xl transition-all duration-200 z-50 origin-top-right transform ${isNotifOpen ? "opacity-100 visible scale-100" : "opacity-0 invisible scale-95"}`}>
                            <div className="flex items-center border-b border-white/10 pb-3 mb-2">
                                <span className="font-semibold text-white text-sm">Notifications</span>
                            </div>

                            <div ref={listRef} className="max-h-56 overflow-y-auto pr-1 flex flex-col gap-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                                {isInitialLoading ? (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                        <Bell className="w-8 h-8 mb-2 opacity-30 text-gray-300" />
                                        <p className="text-xs">No notifications</p>
                                    </div>
                                ) : (
                                    <>
                                        {notifications.map((notif) => {
                                            const actorInitial = notif.actor?.firstName?.charAt(0).toUpperCase() || "?";
                                            return (
                                                <div
                                                    key={notif.id}
                                                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/5"
                                                >
                                                    {/* Actor Avatar */}
                                                    <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-white/10 overflow-hidden">
                                                        {notif.actor?.picture ? (
                                                            <Image
                                                                src={notif.actor.picture}
                                                                alt="Actor avatar"
                                                                width={32}
                                                                height={32}
                                                                className="h-full w-full object-cover"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <span className="text-xs font-semibold text-white">{actorInitial}</span>
                                                        )}
                                                    </div>

                                                    {/* Message Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-200 leading-normal">
                                                            <span className="font-semibold text-white">
                                                                {notif.actor ? `${notif.actor.firstName} ${notif.actor.lastName}` : "Someone"}
                                                            </span>{" "}
                                                            {notif.type === "follow" ? "started following you." : "interacted with you."}
                                                        </p>
                                                        <span className="text-[10px] text-gray-400 mt-1 block">
                                                            {formatDistanceToNow(notif.createdAt)}
                                                        </span>
                                                    </div>

                                                    {/* Unread dot */}
                                                    {!notif.isRead && (
                                                        <span className="flex-shrink-0 h-2 w-2 rounded-full bg-violet-600" />
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Load more spinner */}
                                        {isLoadingMore && (
                                            <div className="flex items-center justify-center py-3">
                                                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                                            </div>
                                        )}

                                        {/* End of list */}
                                        {!hasMore && notifications.length > 0 && (
                                            <p className="text-center text-[10px] text-gray-500 py-2">
                                                All caught up!
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* User Menu Dropdown */}
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
            </div>
        </header>
    );
}
