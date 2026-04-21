'use client';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ConfirmKickModalProps {
    targetName: string;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
    status: 'idle' | 'loading' | 'success' | 'error';
    errorMessage?: string;
}

export default function ConfirmKickModal({ targetName, onConfirm, onCancel, status, errorMessage }: ConfirmKickModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-[#111827] px-8 py-8 shadow-2xl text-center max-w-sm w-full animate-in zoom-in-95 duration-200">
                
                {status === 'idle' && (
                    <>
                        <div className="flex flex-col gap-2">
                            <h2 className="text-xl font-bold text-white">Xác nhận mời ra</h2>
                            <p className="text-sm text-zinc-400">Bạn có chắc chắn muốn mời <span className="font-semibold text-white">{targetName}</span> ra khỏi phòng học này không?</p>
                        </div>
                        <div className="flex items-center gap-3 w-full mt-2">
                            <button
                                onClick={onCancel}
                                className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20 transition-colors cursor-pointer text-white"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold hover:bg-red-500 transition-colors cursor-pointer text-white"
                            >
                                Đồng ý
                            </button>
                        </div>
                    </>
                )}

                {status === 'loading' && (
                    <div className="flex flex-col items-center gap-4 py-4">
                        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                        <p className="text-sm text-zinc-400">Đang xử lý...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4 py-2">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-bold text-white">Thành công</h2>
                            <p className="text-sm text-zinc-400">Đã mời {targetName} ra khỏi phòng</p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="mt-4 rounded-xl bg-violet-600 px-8 py-2.5 text-sm font-semibold hover:bg-violet-500 transition-colors cursor-pointer text-white"
                        >
                            Đóng
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4 py-2">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-bold text-white">Có lỗi xảy ra</h2>
                            <p className="text-sm text-zinc-400">{errorMessage || 'Không thể thực hiện yêu cầu'}</p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="mt-4 rounded-xl bg-white/10 px-8 py-2.5 text-sm font-semibold hover:bg-white/20 transition-colors cursor-pointer text-white"
                        >
                            Trở lại
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
