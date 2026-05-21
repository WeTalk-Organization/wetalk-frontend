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
}

export const userService = {
    follow: (userId: string) =>
        api.post<{ message: string }>(`${API_ENDPOINTS.USERS.BASE}/${userId}/follow`),

    unfollow: (userId: string) =>
        api.delete<{ message: string }>(`${API_ENDPOINTS.USERS.BASE}/${userId}/follow`),

    getFollowers: (userId: string) =>
        api.get<UserProfile[]>(`${API_ENDPOINTS.USERS.BASE}/${userId}/followers`),

    getFollowing: (userId: string) =>
        api.get<UserProfile[]>(`${API_ENDPOINTS.USERS.BASE}/${userId}/following`),

    getStats: (userId: string) =>
        api.get<UserStats>(`${API_ENDPOINTS.USERS.BASE}/${userId}/stats`),

    isFollowing: (userId: string) =>
        api.get<boolean>(`${API_ENDPOINTS.USERS.BASE}/${userId}/is-following`),
};
