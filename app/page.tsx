"use client";
import { useEffect, useState, useCallback } from "react";
import Header from "@/components/common/Header";
import RoomCard from "@/components/room/RoomCard";
import CreateRoomModal from "@/components/room/CreateRoomModal";
import { useAuth } from "@/hooks/useAuth";
import { roomService } from "@/services/room.service";
import { useRouter } from "next/navigation";
import { CreateRoomPayload, RoomListItem, LANGUAGE_MAP, LEVEL_MAP } from "@/types/room";
import CustomSelect from "@/components/common/CustomSelect";
import { useSocket } from "@/hooks/useSocket";
import toast, { Toaster } from "react-hot-toast";

const PAGE_SIZE = 15;

export default function Home() {
  const { loading, user } = useAuth();
  const router = useRouter();

  const { socket } = useSocket();

  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string>("");

  const fetchRooms = useCallback(async (page: number, lang?: string, lvl?: string) => {
    try {
      setError(null);
      setRoomsLoading(true);
      const res = await roomService.getAll(page, PAGE_SIZE, lang, lvl);
      setRooms(res.data.data);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } catch {
      setError("Unable to load active rooms.");
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchRooms(currentPage, languageFilter, levelFilter);
    }
  }, [loading, fetchRooms, currentPage, languageFilter, levelFilter]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("join-lobby");

    const handleRoomCreated = (newRoom: RoomListItem) => {
      setTotal((prev) => prev + 1);
      setCurrentPage((prevPage) => {
        if (prevPage === 1) {
          setRooms((prevRooms) => {
            const isExist = prevRooms.some(room => room.roomId === newRoom.roomId);
            if (isExist) {
              return prevRooms;
            }
            const updatedRooms = [newRoom, ...prevRooms];
            if (updatedRooms.length > PAGE_SIZE) {
              updatedRooms.pop();
            }
            return updatedRooms;
          });
        }
        return prevPage;
      });
    };

    const handleRoomUpdated = (data: { roomId: string; participantCount: number; participants: RoomListItem["participants"] }) => {
      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          if (room.roomId === data.roomId) {
            return {
              ...room,
              participantCount: data.participantCount,
              participants: data.participants,
            };
          }
          return room;
        })
      );
    };

    const handleRoomDeleted = (data: { roomId: string }) => {
      setRooms((prevRooms) => prevRooms.filter((room) => room.roomId !== data.roomId));
      setTotal((prev) => Math.max(0, prev - 1));
    };

    socket.on("room-created", handleRoomCreated);
    socket.on("room-updated", handleRoomUpdated);
    socket.on("room-deleted", handleRoomDeleted);

    return () => {
      socket.off("room-created", handleRoomCreated);
      socket.off("room-updated", handleRoomUpdated);
      socket.off("room-deleted", handleRoomDeleted);
      socket.emit("leave-lobby");
    };
  }, [socket]);

  const handleCreateRoom = async (payload: CreateRoomPayload) => {
    const res = await roomService.create(payload);
    router.push(`/room/${res.data.roomId}`);
  };

  const handleJoin = async (roomId: string) => {
    try {
      await roomService.join(roomId);
      router.push(`/room/${roomId}`);
    } catch (error: unknown) {
      console.error("Failed to join room", error);
      const err = error as { response?: { data?: { message?: string } } };
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Failed to join room. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a] text-white">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <Toaster position="bottom-left" reverseOrder={false} />
      <Header />

      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-4 pt-2 pb-2 text-center">
        <h1 className="text-4xl font-bold">Welcome to WeTalk</h1>
        <p className="text-lg text-gray-400">Learn Languages by Talking</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 cursor-pointer rounded-xl bg-violet-600 px-8 py-3 text-sm font-semibold transition-all hover:bg-violet-500 active:scale-95"
        >
          + Create a new room
        </button>
      </section>

      {/* Create Room Modal */}
      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRoom}
        />
      )}

      {/* Room list */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center text-xl font-semibold gap-3">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-slow-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Active Rooms
            {!roomsLoading && (
              <span className="text-sm font-normal text-gray-400">
                ({total})
              </span>
            )}
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <CustomSelect
              value={languageFilter}
              onChange={(val) => { setLanguageFilter(val); setCurrentPage(1); }}
              options={Object.entries(LANGUAGE_MAP).map(([code, { label }]) => ({ value: code, label }))}
              placeholder="All Languages"
              className="w-40"
            />

            <CustomSelect
              value={levelFilter}
              onChange={(val) => { setLevelFilter(val); setCurrentPage(1); }}
              options={Object.entries(LEVEL_MAP).map(([code, { label }]) => ({ value: code, label }))}
              placeholder="All Levels"
              className="w-36"
            />
          </div>
        </div>

        {/* Loading skeletons */}
        {roomsLoading && (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-2xl bg-white/5"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !roomsLoading && (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-gray-400">
            <p>{error}</p>
            <button
              onClick={() => fetchRooms(currentPage)}
              className="cursor-pointer rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-500"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!roomsLoading && !error && rooms.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
            <p className="text-lg font-medium text-gray-400">
              No active rooms yet
            </p>
            <p className="text-sm">Be the first to create one!</p>
          </div>
        )}

        {/* Room grid */}
        {!roomsLoading && !error && rooms.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <RoomCard
                  key={room.roomId}
                  room={room}
                  currentUserId={user?.id ?? ""}
                  onJoin={handleJoin}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/10 text-sm text-gray-400 transition hover:border-violet-500 hover:text-violet-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  &lt;
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-9 w-9 cursor-pointer rounded-lg text-sm font-semibold transition ${page === currentPage
                        ? "bg-violet-600 text-white"
                        : "border border-white/10 text-gray-400 hover:border-violet-500 hover:text-violet-400"
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/10 text-sm text-gray-400 transition hover:border-violet-500 hover:text-violet-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  &gt;
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
