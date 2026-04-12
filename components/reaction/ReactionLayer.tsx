'use client';
import { SocketUser } from '@/types/webRTC';
import React, { useState, useEffect, useRef, memo } from 'react';
import { Socket } from 'socket.io-client';

// 3 vị trí bay lên: trái, giữa, phải (% từ trái màn hình)
const SLOT_POSITIONS = ['40%', '50%', '60%'];

interface ReactionData {
    id: string;
    reaction: string;
    sender: SocketUser;
    slot: number;
}

const ReactionLayerComponent = ({ socket, currentUserId }: { socket: Socket | null, currentUserId?: string }) => {
    const [reactions, setReactions] = useState<ReactionData[]>([]);
    const slotCounter = useRef(0);

    useEffect(() => {
        if (!socket) return;
        const handleReceiveReaction = (data: { id: string; reaction: string; sender: SocketUser }) => {
            console.log("Receive reaction:", data);
            const slot = slotCounter.current % SLOT_POSITIONS.length;
            slotCounter.current += 1;

            const newReaction: ReactionData = {
                ...data,
                slot,
            };
            setReactions((prev) => [...prev, newReaction]);
            setTimeout(() => {
                setReactions((prev) => prev.filter((r) => r.id !== data.id));
            }, 5000);
        };
        socket.on('receive-reaction', handleReceiveReaction);
        return () => {
            socket.off('receive-reaction', handleReceiveReaction);
        };
    }, [socket]);

    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {reactions.map((r) => (
                <div
                    key={r.id}
                    className="animate-float-up absolute bottom-24 -translate-x-1/2 flex flex-col items-center gap-1"
                    style={{
                        left: SLOT_POSITIONS[r.slot],
                    }}
                >
                    <span className="text-4xl drop-shadow-md">{r.reaction}</span>
                    <span className="text-xs font-medium text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full whitespace-nowrap">
                        {r.sender.id === currentUserId ? 'Bạn' : `${r.sender.firstName} ${r.sender.lastName}`}
                    </span>
                </div>
            ))}
        </div>
    );
};

export const ReactionLayer = memo(ReactionLayerComponent, (prevProps, nextProps) => {
    return prevProps.socket?.id === nextProps.socket?.id;
});
export default ReactionLayer;

