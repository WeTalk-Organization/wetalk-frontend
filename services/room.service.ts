import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/constants/api";
import { CreateRoomPayload, PaginatedRoomList, RoomResponse } from "@/types/room";

export const roomService = {
    create: (data: CreateRoomPayload) => api.post<RoomResponse>(API_ENDPOINTS.ROOM.BASE, data),
    getByRoomId: (roomId: string) =>
        api.get<RoomResponse>(`${API_ENDPOINTS.ROOM.BASE}/${roomId}`),
    getAll: (page: number = 1, limit: number = 15, language?: string, level?: string) =>
        api.get<PaginatedRoomList>(API_ENDPOINTS.ROOM.BASE, { params: { page, limit, language: language || undefined, level: level || undefined } }),
    join: (roomId: string) =>
        api.post<RoomResponse>(`${API_ENDPOINTS.ROOM.BASE}/${roomId}/join`),
    leave: (roomId: string) =>
        api.post<{ message: string }>(`${API_ENDPOINTS.ROOM.BASE}/${roomId}/leave`),
    kick: (roomId: string, targetUserId: string) =>
        api.post<{ kicked: boolean }>(`${API_ENDPOINTS.ROOM.BASE}/${roomId}/kick/${targetUserId}`),
};
