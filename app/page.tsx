"use client"
import Header from "@/components/common/Header";
import { useAuth } from "@/hooks/useAuth";
import { meetingService } from "@/services/meeting.service";
import { useRouter } from "next/navigation";

export default function Home() {
  const { loading } = useAuth();
  const router = useRouter();

  const handleCreateMeeting = async () => {
    try {
      const res = await meetingService.create();
      const { roomId } = res.data;
      router.push(`/meeting/${roomId}`);
    } catch (error) {
      console.error("Tạo meeting thất bại:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a] text-white">
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <Header />
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-bold">Chào mừng đến Meetiva</h1>
        <p className="text-lg text-zinc-400">Nền tảng họp trực tuyến thông minh</p>
        <button
          onClick={handleCreateMeeting}
          className="mt-4 cursor-pointer rounded-xl bg-violet-600 px-8 py-3 text-sm font-semibold transition-all hover:bg-violet-500 active:scale-95">
          Tạo phòng họp mới
        </button>
      </div>
    </div>
  );
}
