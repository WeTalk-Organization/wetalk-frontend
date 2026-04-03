import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(roomId: string) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const socketRef = useRef<Socket | null>(null);
    useEffect(() => {
        if (!roomId) return;

        const socketInstance = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000', {
            transports: ['websocket'],
        });

        socketRef.current = socketInstance;

        socketInstance.on('connect', () => {
            console.log('✅ Đã kết nối Socket Signaling! Socket ID:', socketInstance.id);
            setSocket(socketInstance);
        });

        socketInstance.on('connect_error', (error) => {
            console.error('❌ Lỗi kết nối Socket:', error);
        });

        socketInstance.on('disconnect', () => {
            console.log('⚠️ Đã ngắt kết nối Signaling Socket!');
            setSocket(null);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [roomId]);
    return { socket };
}