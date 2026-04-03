import { User } from "@/types/auth";

export function isTokenExpired(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
}

export function decodeToken(token: string): User | null {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            id: payload.id,
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            avatar: payload.avatar,
        };
    } catch {
        return null;
    }
}