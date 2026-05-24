import { useEffect, useState } from "react";
import { followService, UserProfile } from "@/services/follow.service";
import { Users, X } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
const PAGE_SIZE = 10;
export default function ActiveFollowingList() {
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const { socket } = useSocket();

  useEffect(() => {
    const fetchActiveFollowing = async () => {
      if (page > 1) setIsFetchingMore(true);
      try {
        const res = await followService.getActiveFollowing(page, PAGE_SIZE);
        if (page === 1) {
          setFollowing(res.data.data);
        } else {
          setFollowing((prev) => {
            const newItems = res.data.data;
            const existingIds = new Set(prev.map(u => u.id));
            return [...prev, ...newItems.filter(u => !existingIds.has(u.id))];
          });
        }
        setTotal(res.data.total);
        setHasMore(res.data.data.length === 10);
      } catch (error) {
        console.error("Failed to fetch active following", error);
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    };
    fetchActiveFollowing();
  }, [page]);

  useEffect(() => {
    if (!socket) return;

    const handleStatusChanged = (data: { userId: string; isOnline: boolean }) => {
      setFollowing((prev) => {
        const index = prev.findIndex((u) => u.id === data.userId);
        if (index === -1) return prev;

        const updated = [...prev];
        updated[index] = { ...updated[index], isOnline: data.isOnline };
        return updated.sort((a, b) => Number(b.isOnline) - Number(a.isOnline));
      });
    };

    socket.on('following-status-changed', handleStatusChanged);
    return () => {
      socket.off('following-status-changed', handleStatusChanged);
    };
  }, [socket]);

  if (loading || following.length === 0) {
    return null;
  }

  const onlineCount = following.filter(u => u.isOnline).length;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-violet-600 text-white shadow-lg shadow-violet-500/30 transition-all hover:scale-105 hover:bg-violet-500 active:scale-95"
        >
          <Users size={24} />
          {onlineCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0a0a1a] bg-emerald-500 text-[10px] font-bold">
              {onlineCount}
            </span>
          )}
        </button>
      ) : (
        <div className="flex h-[400px] w-72 flex-col overflow-hidden rounded-2xl border border-violet-500/20 bg-[#0a0a1a]/95 shadow-2xl shadow-violet-900/20 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-violet-500/20 bg-violet-900/20 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-white">
              Following
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                {total}
              </span>
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="cursor-pointer rounded-full p-1 text-gray-400 transition-colors hover:bg-violet-500/20 hover:text-violet-300"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto p-2 scrollbar-hide"
            onScroll={(e) => {
              const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
              if (scrollHeight - scrollTop <= clientHeight * 1.5 && !isFetchingMore && hasMore) {
                setPage((p) => p + 1);
              }
            }}
          >
            {following.map((user) => (
              <div
                key={user.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-violet-500/10"
              >
                <div className="relative h-10 w-10 flex-shrink-0 rounded-full bg-[#1a1a3a]">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.firstName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-violet-600/30 text-sm font-bold text-violet-300">
                      {user.firstName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {user.isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0a0a1a] bg-emerald-500"></span>
                  )}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-medium text-gray-200">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-xs text-gray-500">
                    {user.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
