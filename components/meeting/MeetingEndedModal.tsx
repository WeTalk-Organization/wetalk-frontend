'use client';

interface MeetingEndedModalProps {
    onGoHome: () => void;
}

export default function MeetingEndedModal({ onGoHome }: MeetingEndedModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-[#111827] px-12 py-10 shadow-2xl text-center">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold text-white">Cuộc họp đã kết thúc</h2>
                    <p className="text-sm text-zinc-400">Chủ phòng đã kết thúc cuộc họp này</p>
                </div>
                <button
                    onClick={onGoHome}
                    className="rounded-xl bg-violet-600 px-8 py-2.5 text-sm font-semibold hover:bg-violet-500 transition-colors cursor-pointer"
                >
                    Về trang chủ
                </button>
            </div>
        </div>
    );
}
