"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function CallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const hasTokens = accessToken && refreshToken;

    useEffect(() => {
        if (accessToken && refreshToken) {
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("refreshToken", refreshToken);
            router.replace("/");
        }
    }, [searchParams, router, accessToken, refreshToken]);

    if (!hasTokens) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a] text-white">
                <div className="text-center">
                    <p className="mb-4 text-lg font-semibold text-red-400">
                        Đăng nhập thất bại. Không nhận được token.
                    </p>
                    <a href="/login" className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold">
                        Thử lại
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a] text-white">
            <p className="text-lg">Đang xử lý đăng nhập...</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#0a0a1a] text-white">Loading...</div>}>
            <CallbackContent />
        </Suspense>
    );
}
