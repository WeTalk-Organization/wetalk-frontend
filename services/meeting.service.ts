import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/constants/api";
import { MeetingResponse } from "@/types/meeting";

export const meetingService = {
    create: () => api.post<MeetingResponse>(API_ENDPOINTS.MEETING.BASE),
    getByRoomId: (roomId: string) =>
        api.get<MeetingResponse>(`${API_ENDPOINTS.MEETING.BASE}/${roomId}`),
    join: (roomId: string) =>
        api.post<MeetingResponse>(`${API_ENDPOINTS.MEETING.BASE}/${roomId}/join`),
    leave: (roomId: string) =>
        api.post<{ message: string }>(`${API_ENDPOINTS.MEETING.BASE}/${roomId}/leave`),
};
