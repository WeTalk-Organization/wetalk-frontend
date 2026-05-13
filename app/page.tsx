"use client"
import Header from "@/components/common/Header";
import { useAuth } from "@/hooks/useAuth";
import { roomService } from "@/services/room.service";
import { useRouter } from "next/navigation";
import { useSubtitle } from "@/hooks/useSubtitle";

export default function Home() {
  const { loading } = useAuth();
  const router = useRouter();

  const handleCreateRoom = async () => {
    try {
      const res = await roomService.create();
      const roomId = res.data.roomId;
      router.push(`/room/${roomId}`);
    } catch (error) {
      console.error("Tạo phòng thất bại:", error);
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
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Welcome to WeTalk</h1>
          <p className="text-lg text-gray-300">Learn Languages by Talking</p>
        </div>
        <button
          onClick={handleCreateRoom}
          className="mt-4 cursor-pointer rounded-xl bg-violet-600 px-8 py-3 text-sm font-semibold transition-all hover:bg-violet-500 active:scale-95">
          Tạo phòng trò chuyện mới
        </button>
      </div>
    </div>
  );
}
