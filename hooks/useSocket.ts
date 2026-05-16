import { SocketContext } from '@/contexts/SocketContext';
import { useContext } from 'react';

export function useSocket(roomId?: string) {
    const { socket } = useContext(SocketContext);
    return { socket };
}