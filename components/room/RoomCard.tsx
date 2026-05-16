"use client";
import { RoomListItem, LANGUAGE_MAP, LEVEL_MAP, TOPIC_MAP } from "@/types/room";

interface RoomCardProps {
    room: RoomListItem;
    currentUserId: string;
    onJoin: (roomId: string) => void;
}

function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    return `${Math.floor(diff / 3600)} hours ago`;
}

export default function RoomCard({ room, currentUserId, onJoin }: RoomCardProps) {
    const displayParticipants = room.participants.slice(0, 10);
    const overflow = room.participantCount - 10;
    const isHost = room.hostId === currentUserId;

    return (
        <div className="relative flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all hover:border-violet-500/50 hover:bg-white/8 hover:shadow-lg hover:shadow-violet-500/10">

            {/* Header: Language, Level & Time */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {room.language && LANGUAGE_MAP[room.language] && (
                        <div className="flex items-center gap-1.5 text-base font-bold text-gray-100">
                            <span>{LANGUAGE_MAP[room.language].label}</span>
                        </div>
                    )}
                    {room.level && LEVEL_MAP[room.level] && (
                        <div className="flex items-center rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                            {LEVEL_MAP[room.level].label}
                        </div>
                    )}
                </div>
                <span className="shrink-0 text-xs text-gray-500">{timeAgo(room.createdAt)}</span>
            </div>

            {/* Topics row */}
            {room.topics && room.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                    {room.topics.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300 shadow-sm">
                            <span>{TOPIC_MAP[t]?.emoji}</span>
                            <span>{t}</span>
                        </span>
                    ))}
                </div>
            )}

            {/* Participants avatars */}
            <div className="mt-auto flex flex-col gap-3 pt-3">
                <div className="flex flex-wrap items-center gap-y-3 pl-3 my-3">
                    {displayParticipants.map((p) =>
                        p.avatar ? (
                            <img
                                key={p.userId}
                                src={p.avatar}
                                alt={`${p.firstName} ${p.lastName}`}
                                className="shrink-0 aspect-square min-h-[80px] min-w-[80px] -ml-3 h-14 w-14 rounded-full border-2 border-[#0a0a1a] object-cover"
                            />
                        ) : (
                            <div
                                key={p.userId}
                                className="shrink-0 aspect-square min-h-[80px] min-w-[80px] -ml-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#0a0a1a] bg-violet-700 text-sm font-bold"
                            >
                                {(p.firstName?.[0] ?? "?").toUpperCase()}
                            </div>
                        )
                    )}
                    {overflow > 0 && (
                        <div className="shrink-0 aspect-square min-h-[80px] min-w-[80px] -ml-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#0a0a1a] bg-gray-700 text-sm font-bold">
                            +{overflow}
                        </div>
                    )}
                </div>
                <div className="flex justify-start">
                    <span className="text-sm text-gray-400">
                        {room.participantCount}
                        {room.maxParticipants
                            ? <span>/{room.maxParticipants} <span className="text-xs">people</span></span>
                            : <span> {room.participantCount === 1 ? "person" : "people"}</span>
                        }
                    </span>
                </div>
            </div>

            {/* Join button */}
            <button
                onClick={() => onJoin(room.roomId)}
                className="w-full cursor-pointer rounded-xl bg-violet-600 py-2 text-sm font-semibold transition-all hover:bg-violet-500 active:scale-95"
            >
                {isHost ? "Your Room" : "Join Room"}
            </button>
        </div>
    );
}
