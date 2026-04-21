import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/constants/api";
import { RoomResponse } from "@/types/room";

export const roomService = {
    create: () => api.post<RoomResponse>(API_ENDPOINTS.ROOM.BASE),
    getByRoomId: (roomId: string) =>
        api.get<RoomResponse>(`${API_ENDPOINTS.ROOM.BASE}/${roomId}`),
    join: (roomId: string) =>
        api.post<RoomResponse>(`${API_ENDPOINTS.ROOM.BASE}/${roomId}/join`),
    leave: (roomId: string) =>
        api.post<{ message: string }>(`${API_ENDPOINTS.ROOM.BASE}/${roomId}/leave`),
    kick: (roomId: string, targetUserId: string) =>
        api.post<{ kicked: boolean }>(`${API_ENDPOINTS.ROOM.BASE}/${roomId}/kick/${targetUserId}`),
};
