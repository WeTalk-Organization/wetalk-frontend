'use client';

interface DuplicateSessionModalProps {
    onGoHome: () => void;
}

export default function DuplicateSessionModal({ onGoHome }: DuplicateSessionModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-orange-500/30 bg-[#111827] px-12 py-10 shadow-[0_0_50px_rgba(249,115,22,0.15)] text-center">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold text-orange-500">Connection Interrupted</h2>
                    <p className="text-sm text-zinc-400">Your account has joined the room from another tab or device.</p>
                </div>
                <button
                    onClick={onGoHome}
                    className="rounded-xl bg-violet-600 px-8 py-2.5 text-sm font-semibold hover:bg-violet-500 transition-colors cursor-pointer text-white"
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
}
