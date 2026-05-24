import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/constants/api";

export interface UserStats {
    followerCount: number;
    followingCount: number;
}

export interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    picture?: string;
    isFollowing?: boolean;
    isMe?: boolean;
    isOnline?: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

export const followService = {
    follow: (userId: string) =>
        api.post<{ message: string }>(`${API_ENDPOINTS.FOLLOWS.BASE}/${userId}`),

    unfollow: (userId: string) =>
        api.delete<{ message: string }>(`${API_ENDPOINTS.FOLLOWS.BASE}/${userId}`),

    getFollowers: (userId: string, page = 1, limit = 10, search?: string) =>
        api.get<PaginatedResponse<UserProfile>>(`${API_ENDPOINTS.FOLLOWS.BASE}/${userId}/followers`, { params: { page, limit, search } }),

    getFollowing: (userId: string, page = 1, limit = 10, search?: string) =>
        api.get<PaginatedResponse<UserProfile>>(`${API_ENDPOINTS.FOLLOWS.BASE}/${userId}/following`, { params: { page, limit, search } }),

    getFollowingIds: () =>
        api.get<string[]>(`${API_ENDPOINTS.FOLLOWS.BASE}/me/ids`),

    getOnlineFollowingCount: () =>
        api.get<{ onlineCount: number }>(`${API_ENDPOINTS.FOLLOWS.BASE}/me/online-count`),

    getActiveFollowing: (page = 1, limit = 10) =>
        api.get<PaginatedResponse<UserProfile>>(`${API_ENDPOINTS.FOLLOWS.BASE}/me/active`, { params: { page, limit } }),

    getStats: (userId: string) =>
        api.get<UserStats>(`${API_ENDPOINTS.FOLLOWS.BASE}/${userId}/stats`),

    isFollowing: (userId: string) =>
        api.get<boolean>(`${API_ENDPOINTS.FOLLOWS.BASE}/${userId}/status`),
};
