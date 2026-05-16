'use client';

interface KickedModalProps {
    onGoHome: () => void;
}

export default function KickedModal({ onGoHome }: KickedModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-red-500/30 bg-[#111827] px-12 py-10 shadow-[0_0_50px_rgba(220,38,38,0.15)] text-center">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold text-red-500">You have been removed from the room</h2>
                    <p className="text-sm text-zinc-400">You can no longer stay in this room.</p>
                </div>
                <button
                    onClick={onGoHome}
                    className="rounded-xl bg-red-600 px-8 py-2.5 text-sm font-semibold hover:bg-red-500 transition-colors cursor-pointer text-white"
                >
                    Return to home
                </button>
            </div>
        </div>
    );
}
