import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/constants/api";

export interface Notification {
    id: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    actor: {
        id: string;
        firstName: string;
        lastName: string;
        picture?: string;
    };
}

export interface NotificationPage {
    data: Notification[];
    total: number;
    page: number;
    limit: number;
}

export const notificationService = {
    getNotifications: (page: number = 1, limit: number = 5) =>
        api.get<NotificationPage>(API_ENDPOINTS.NOTIFICATIONS.BASE, {
            params: { page, limit },
        }),

    getUnreadCount: () =>
        api.get<{ count: number }>(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/unread-count`),

    markAsRead: (id: string) =>
        api.patch<{ id: string; isRead: boolean }>(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/${id}/read`),

    markAllAsRead: () =>
        api.patch<{ success: boolean }>(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/read-all`),
};
