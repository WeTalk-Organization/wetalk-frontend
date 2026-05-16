import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/constants/api";

export const authService = {
    updateProfile: (formData: FormData) =>
        api.patch<{ message: string; accessToken: string; user: Record<string, unknown> }>(
            API_ENDPOINTS.AUTH.PROFILE,
            formData
        ),
};
