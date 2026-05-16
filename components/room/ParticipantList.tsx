import React from 'react';
import type { Participant } from '@/types/room';
import { X, UserX } from 'lucide-react';

interface ParticipantListProps {
    participants: Participant[];
    currentUserId: string | undefined;
    hostId: string | undefined;
    onClose: () => void;
    onKick?: (userId: string, targetName: string) => void;
}

const ParticipantList: React.FC<ParticipantListProps> = ({ participants, currentUserId, hostId, onClose, onKick }) => {
    const isCurrentUserHost = currentUserId === hostId;

    return (
        <div className="flex flex-col h-full w-[350px] bg-[#1A1D24] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.4)] overflow-hidden font-sans border border-white/10">
            {/* Header */}
            <div className="px-5 py-4 bg-[#2B2D36]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                    <h3 className="font-semibold text-white text-base m-0 tracking-wide">
                        Participants ({participants.length})
                    </h3>
                </div>
                <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                {participants.length === 0 && (
                    <div className="text-center text-[#6B6D76] mt-5 text-[13px]">
                        No one is in the room.
                    </div>
                )}
                {participants.map((p) => {
                    const isMine = currentUserId === p.userId;
                    const isHost = hostId === p.userId;
                    const displayName = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'User';
                    const firstLetter = displayName.charAt(0).toUpperCase();

                    return (
                        <div key={p.userId} className="flex items-center gap-3 w-full animate-in slide-in-from-bottom-2 duration-300">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                                {p.avatar ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={p.avatar}
                                            alt="avatar"
                                            className="w-10 h-10 rounded-full object-cover shadow-sm border border-white/10"
                                            referrerPolicy="no-referrer"
                                        />
                                    </>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00C6FF] to-[#0072FF] flex items-center justify-center text-white text-[14px] font-bold shadow-sm border border-white/10">
                                        {firstLetter}
                                    </div>
                                )}

                            </div>

                            {/* Name & badges */}
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-[14px] text-[#E2E4EB] truncate font-medium flex items-center gap-1.5">
                                    {displayName}
                                    {isMine && <span className="text-[#9496A1] text-[12px] font-normal">(You)</span>}
                                </span>
                                {isHost && (
                                    <span className="text-[11px] font-semibold text-amber-400/90 tracking-wide">
                                        Host
                                    </span>
                                )}
                            </div>

                            {isCurrentUserHost && !isMine && !isHost && onKick && (
                                <button
                                    onClick={() => onKick(p.userId, displayName)}
                                    className="p-1.5 ml-auto text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors group relative"
                                    title={`Kick ${displayName}`}
                                >
                                    <UserX className="w-4 h-4" />
                                    <span className="absolute bottom-[120%] right-0 rounded-md bg-[#2B2D36]/90 px-2 py-1 text-[11px] font-medium text-white opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100 whitespace-nowrap pointer-events-none border border-white/10 shadow-lg backdrop-blur-md z-50">
                                        Remove from room
                                    </span>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(ParticipantList);
