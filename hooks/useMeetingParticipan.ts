import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import type { Participant, UserEventPayload } from '@/types/meeting';
import toast from 'react-hot-toast';

// Khớp với SocketUser interface bên backend



export function useMeetingParticipants(
    socket: Socket | null,
    initialParticipants: Participant[] | undefined,
) {
    const [participants, setParticipants] = useState<Participant[]>(
        initialParticipants ?? [],
    );

    useEffect(() => {
        if (initialParticipants) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setParticipants(initialParticipants);
        }
    }, [initialParticipants]);

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
                    avatarUrl: user.avatar,
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

        socket.on('user-joined', handleUserJoined);
        socket.on('user-left', handleUserLeft);

        return () => {
            socket.off('user-joined', handleUserJoined);
            socket.off('user-left', handleUserLeft);
        };
    }, [socket]);

    return { participants };
}
