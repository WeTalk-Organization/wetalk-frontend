"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, UserPlus, UserMinus, Loader2, Users } from "lucide-react";
import { userService } from "@/services/user.service";

export interface ProfileCacheEntry {
    followerCount: number;
    followingCount: number;
    isFollowing: boolean;
}

interface UserProfileModalProps {
    targetUserId: string;
    targetName: string;
    targetAvatar?: string;
    currentUserId: string | undefined;
    onClose: () => void;
    /** Pre-fetched data from parent cache — skips API calls when present */
    initialData?: ProfileCacheEntry;
    /** Called after a successful fetch so the parent can cache the result */
    onDataLoaded?: (userId: string, data: ProfileCacheEntry) => void;
}

interface Stats {
    followerCount: number;
    followingCount: number;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
    targetUserId,
    targetName,
    targetAvatar,
    currentUserId,
    onClose,
    initialData,
    onDataLoaded,
}) => {
    const [stats, setStats] = useState<Stats | null>(
        initialData ? { followerCount: initialData.followerCount, followingCount: initialData.followingCount } : null
    );
    const [loadingStats, setLoadingStats] = useState(!initialData);
    const [isFollowing, setIsFollowing] = useState(initialData?.isFollowing ?? false);
    const [loadingFollow, setLoadingFollow] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Close on overlay click
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === overlayRef.current) onClose();
    };

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    // Fetch stats + follow status — skipped entirely when initialData is provided
    useEffect(() => {
        if (initialData) return;

        let isMounted = true;
        const load = async () => {
            setLoadingStats(true);
            try {
                const [statsRes, followRes] = await Promise.all([
                    userService.getStats(targetUserId),
                    currentUserId ? userService.isFollowing(targetUserId) : Promise.resolve({ data: false }),
                ]);
                if (isMounted) {
                    setStats(statsRes.data);
                    setIsFollowing(followRes.data as boolean);
                    onDataLoaded?.(targetUserId, {
                        followerCount: statsRes.data.followerCount,
                        followingCount: statsRes.data.followingCount,
                        isFollowing: followRes.data as boolean,
                    });
                }
            } catch (err) {
                console.error("Failed to load user profile data", err);
            } finally {
                if (isMounted) setLoadingStats(false);
            }
        };
        load();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetUserId, currentUserId]);

    const handleFollowToggle = async () => {
        if (!currentUserId) return;
        setLoadingFollow(true);
        try {
            if (isFollowing) {
                await userService.unfollow(targetUserId);
                const newFollowerCount = (stats?.followerCount ?? 0) - 1;
                setIsFollowing(false);
                setStats(prev => prev ? { ...prev, followerCount: newFollowerCount } : prev);
                onDataLoaded?.(targetUserId, {
                    followerCount: newFollowerCount,
                    followingCount: stats?.followingCount ?? 0,
                    isFollowing: false,
                });
            } else {
                await userService.follow(targetUserId);
                const newFollowerCount = (stats?.followerCount ?? 0) + 1;
                setIsFollowing(true);
                setStats(prev => prev ? { ...prev, followerCount: newFollowerCount } : prev);
                onDataLoaded?.(targetUserId, {
                    followerCount: newFollowerCount,
                    followingCount: stats?.followingCount ?? 0,
                    isFollowing: true,
                });
            }
        } catch (err) {
            console.error("Failed to toggle follow", err);
        } finally {
            setLoadingFollow(false);
        }
    };

    const firstLetter = (targetName ?? "U").charAt(0).toUpperCase();

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
            <div className="relative w-[340px] rounded-2xl border border-white/10 bg-[#1A1D24] shadow-[0_25px_60px_rgba(0,0,0,0.6)] animate-in zoom-in-95 fade-in duration-200 overflow-hidden">

                {/* Gradient banner */}
                <div className="h-20 w-full bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800" />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-all"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Avatar — overlaps banner */}
                <div className="flex flex-col items-center px-6 pb-6">
                    <div className="-mt-10 mb-3">
                        {targetAvatar ? (
                            <Image
                                src={targetAvatar}
                                alt={targetName}
                                width={80}
                                height={80}
                                className="h-20 w-20 rounded-full object-cover border-4 border-[#1A1D24] shadow-xl"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="h-20 w-20 rounded-full border-4 border-[#1A1D24] bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl">
                                {firstLetter}
                            </div>
                        )}
                    </div>

                    {/* Name */}
                    <h2 className="text-lg font-bold text-white text-center leading-tight">
                        {targetName}
                    </h2>

                    {/* Stats */}
                    <div className="mt-4 w-full flex items-center justify-center gap-8">
                        {loadingStats ? (
                            <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Loading...</span>
                            </div>
                        ) : stats ? (
                            <>
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-xl font-bold text-white">{stats.followerCount}</span>
                                    <span className="text-xs text-zinc-400 tracking-wide">Followers</span>
                                </div>
                                <div className="w-px h-8 bg-white/10" />
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-xl font-bold text-white">{stats.followingCount}</span>
                                    <span className="text-xs text-zinc-400 tracking-wide">Following</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                                <Users className="h-3.5 w-3.5" />
                                <span>Stats unavailable</span>
                            </div>
                        )}
                    </div>

                    {/* Follow button */}
                    {currentUserId && (
                        <button
                            onClick={handleFollowToggle}
                            disabled={loadingFollow || loadingStats}
                            className={`mt-5 w-full cursor-pointer flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed
                                ${isFollowing
                                    ? "bg-zinc-700/60 text-white hover:bg-red-500/20 hover:text-red-400 border border-white/10 hover:border-red-500/30"
                                    : "bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                                }`}
                        >
                            {loadingFollow ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isFollowing ? (
                                <>
                                    <UserMinus className="h-4 w-4" />
                                    <span>Unfollow</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-4 w-4" />
                                    <span>Follow</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
