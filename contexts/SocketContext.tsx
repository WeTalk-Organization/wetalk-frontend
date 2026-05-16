"use client";
import React, { createContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextProps {
    socket: Socket | null;
}

export const SocketContext = createContext<SocketContextProps>({ socket: null });

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        const socketInstance = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000", {
            transports: ["websocket"],
        });

        socketInstance.on("connect", () => {
            console.log("✅ Đã kết nối Socket Global! Socket ID:", socketInstance.id);
            setSocket(socketInstance);
        });

        socketInstance.on("connect_error", (error) => {
            console.error("❌ Lỗi kết nối Socket:", error);
        });

        socketInstance.on("disconnect", () => {
            console.log("⚠️ Đã ngắt kết nối Socket Global!");
            setSocket(null);
        });

        // Tự động ngắt kết nối nếu người dùng tắt trang web
        return () => {
            socketInstance.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};
