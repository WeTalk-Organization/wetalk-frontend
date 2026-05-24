import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { followService, UserProfile } from "@/services/follow.service";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: "followers" | "following";
  onUnfollow?: () => void;
}

export default function FollowListModal({ isOpen, onClose, userId, type, onUnfollow }: FollowListModalProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [unfollowingIds, setUnfollowingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setDebouncedSearch("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const totalRef = useRef(0);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let isMounted = true;

    const fetchFirstPage = async () => {
      setLoading(true);
      setUsers([]);
      pageRef.current = 1;

      try {
        const response =
          type === "followers"
            ? await followService.getFollowers(userId, 1, PAGE_SIZE, debouncedSearch)
            : await followService.getFollowing(userId, 1, PAGE_SIZE, debouncedSearch);

        if (isMounted) {
          const { data, total } = response.data;
          totalRef.current = total;
          setUsers(data);
          setHasMore(data.length < total);
        }
      } catch (error) {
        console.error("Failed to fetch users", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFirstPage();

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId, type, debouncedSearch]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;

    const nextPage = pageRef.current + 1;
    setLoadingMore(true);

    try {
      const response =
        type === "followers"
          ? await followService.getFollowers(userId, nextPage, PAGE_SIZE, debouncedSearch)
          : await followService.getFollowing(userId, nextPage, PAGE_SIZE, debouncedSearch);

      const { data, total } = response.data;
      pageRef.current = nextPage;
      totalRef.current = total;

      setUsers((prev) => {
        const newUsers = [...prev, ...data];
        setHasMore(newUsers.length < total);
        return newUsers;
      });
    } catch (error) {
      console.error("Failed to load more", error);
    } finally {
      setLoadingMore(false);
    }
  }, [userId, type, loadingMore, debouncedSearch]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, loading, hasMore, loadingMore]);

  const handleFollow = async (targetId: string) => {
    setFollowingIds((prev) => new Set(prev).add(targetId));
    try {
      await followService.follow(targetId);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, isFollowing: true } : u))
      );
    } catch (error) {
      console.error("Failed to follow", error);
      toast.error("Failed to follow. Please try again.");
    } finally {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  const handleUnfollow = async (targetId: string) => {
    setUnfollowingIds((prev) => new Set(prev).add(targetId));
    try {
      await followService.unfollow(targetId);
      if (type === "following") {
        setUsers((prev) => prev.filter((u) => u.id !== targetId));
        onUnfollow?.();
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetId ? { ...u, isFollowing: false } : u))
        );
      }
    } catch (error) {
      console.error("Failed to unfollow", error);
      toast.error("Failed to unfollow. Please try again.");
    } finally {
      setUnfollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1a1a2e] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {type === "followers" ? "Followers" : "Following"}
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 transition-all"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {type === "followers" ? "No followers yet." : "Not following anyone yet."}
            </div>
          ) : (
            <>
              {users.map((u) => {
                const initial = u.firstName?.charAt(0).toUpperCase() || "?";
                const isFollowingAction = followingIds.has(u.id);
                const isUnfollowingAction = unfollowingIds.has(u.id);
                const isBusy = isFollowingAction || isUnfollowingAction;

                return (
                  <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="relative w-11 h-11 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                      {u.picture ? (
                        <Image src={u.picture} alt={u.firstName} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 font-semibold">
                          {initial}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {u.firstName} {u.lastName}
                      </p>
                    </div>

                    {!u.isMe && (
                      u.isFollowing ? (
                        type === "following" ? (
                          <button
                            onClick={() => handleUnfollow(u.id)}
                            disabled={isBusy}
                            className={`cursor-pointer flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isBusy
                              ? "bg-white/5 text-gray-500 cursor-not-allowed"
                              : "bg-white/5 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-white/10 hover:border-red-500/30"
                              }`}
                          >
                            {isBusy ? "..." : "Unfollow"}
                          </button>
                        ) : (
                          <span className="flex-shrink-0 text-xs font-semibold text-violet-400">
                            Following
                          </span>
                        )
                      ) : (
                        <button
                          onClick={() => handleFollow(u.id)}
                          disabled={isBusy}
                          className={`cursor-pointer flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isBusy
                            ? "bg-white/5 text-gray-500 cursor-not-allowed"
                            : "bg-violet-600 hover:bg-violet-500 text-white"
                            }`}
                        >
                          {isBusy ? "..." : "Follow"}
                        </button>
                      )
                    )}
                  </div>
                );
              })}

              <div ref={sentinelRef} className="py-2 flex justify-center">
                {loadingMore && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-500/50"></div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
