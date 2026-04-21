import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import type { Participant, UserEventPayload } from '@/types/room';
import toast from 'react-hot-toast';

export function useRoomParticipants(
    socket: Socket | null,
    initialParticipants: Participant[] | undefined,
) {
    const [participants, setParticipants] = useState<Participant[]>(initialParticipants ?? []);
    const [prevInitial, setPrevInitial] = useState(initialParticipants);

    if (initialParticipants !== prevInitial) {
        setPrevInitial(initialParticipants);
        setParticipants(initialParticipants ?? []);
    }

    useEffect(() => {
        if (!socket) return;

        const handleUserJoined = ({ user }: UserEventPayload) => {
            toast.success(
                `${[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Ai đó'} vừa tham gia phòng!`,
                { style: { background: '#22c55e', color: '#fff' } },
            );

            setParticipants(prev => {
                const exists = prev.some(p => p.userId === user.id);
                if (exists) return prev;

                const newParticipant: Participant = {
                    userId: user.id,
                    firstName: user.firstName ?? '',
                    lastName: user.lastName ?? '',
                    avatar: user.avatar,
                    videoEnabled: false,
                    audioEnabled: false,
                };
                return [...prev, newParticipant];
            });
        };

        const handleUserLeft = ({ user }: UserEventPayload) => {
            toast(
                `${[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Ai đó'} đã rời phòng`,
                { style: { background: '#4b5563', color: '#fff' } },
            );

            setParticipants(prev => prev.filter(p => p.userId !== user.id));
        };

        const handleParticipantKicked = ({ userId }: { userId: string }) => {
            setParticipants(prev => prev.filter(p => p.userId !== userId));
        };

        socket.on('user-joined', handleUserJoined);
        socket.on('user-left', handleUserLeft);
        socket.on('participant-kicked', handleParticipantKicked);

        return () => {
            socket.off('user-joined', handleUserJoined);
            socket.off('user-left', handleUserLeft);
            socket.off('participant-kicked', handleParticipantKicked);
        };
    }, [socket]);

    return { participants };
}
