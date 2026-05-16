"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { decodeToken, isTokenExpired } from "@/utils/token";
import { User } from "@/types/auth";

export function useAuth() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("accessToken");
            console.log(token);
            if (!token || isTokenExpired(token)) {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                router.replace("/login");
                setLoading(false);
                return;
            }
            setUser(decodeToken(token));
            setLoading(false);
        };
        checkAuth();

        window.addEventListener("auth-updated", checkAuth);
        return () => window.removeEventListener("auth-updated", checkAuth);
    }, [router]);

    const logout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        router.replace("/login");
    }
    return { user, loading, logout };
}