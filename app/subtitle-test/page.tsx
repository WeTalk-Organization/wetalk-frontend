"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// ─── Constants (giống useSubtitle.ts) ────────────────────────────────────────
const RMS_THRESHOLD = 0.01;
const SPEAKING_THRESHOLD = 10;
const SILENCE_DURATION_MS = 700;
const MAX_CHUNK_DURATION_MS = 8000;
const POLL_INTERVAL_MS = 100;

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function computeRms(blob: Blob): Promise<number> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContext();
    try {
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        let sumSquares = 0;
        for (let i = 0; i < channelData.length; i++) {
            sumSquares += channelData[i] * channelData[i];
        }
        return Math.sqrt(sumSquares / channelData.length);
    } catch {
        return 0;
    } finally {
        await audioCtx.close();
    }
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleTimeString("vi-VN", { hour12: false }) +
        "." + String(d.getMilliseconds()).padStart(3, "0");
}

// ─── Types ────────────────────────────────────────────────────────────────────
type StopReason = "silence" | "max-duration" | "manual";

interface AudioChunk {
    id: number;
    blob: Blob;
    url: string;
    timestamp: number;
    duration: number;     // ms
    sizeBytes: number;
    rms: number;
    passed: boolean;      // vượt RMS threshold hay không
    stopReason: StopReason;
}

// ─── Component ────────────────────────────────────────────────────────────────
const LANGUAGES = [
    { value: "auto", label: "🌐 Auto-detect" },
    { value: "vi", label: "🇻🇳 Tiếng Việt" },
    { value: "en", label: "🇬🇧 English" },
    { value: "ja", label: "🇯🇵 日本語" },
    { value: "ko", label: "🇰🇷 한국어" },
    { value: "zh", label: "🇨🇳 中文" },
    { value: "fr", label: "🇫🇷 Français" },
    { value: "de", label: "🇩🇪 Deutsch" },
];

export default function SubtitleTestPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [chunks, setChunks] = useState<AudioChunk[]>([]);
    const [statusLog, setStatusLog] = useState<string[]>([]);
    const [currentState, setCurrentState] = useState<"idle" | "speaking" | "silence-wait">("idle");
    const [avgFreq, setAvgFreq] = useState(0);
    const [subtitle, setSubtitle] = useState("");
    const [language, setLanguage] = useState("en");
    const [socketConnected, setSocketConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const subtitleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Refs cho VAD engine
    const micStreamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const isRecordingRef = useRef(false);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const chunkIdRef = useRef(0);
    const chunkStartRef = useRef(0);
    const stopReasonRef = useRef<StopReason>("silence");
    const lastLoggedSpeakingRef = useRef<boolean | null>(null);

    // ── Socket setup ──────────────────────────────────────────────────────────
    useEffect(() => {
        const sock = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000", {
            transports: ["websocket"],
        });
        socketRef.current = sock;

        sock.on("connect", () => setSocketConnected(true));
        sock.on("disconnect", () => setSocketConnected(false));

        sock.on("transcribe-result", ({ text }: { text: string; timestamp: number }) => {
            console.log("[Subtitle] transcribe-result:", text);
            if (text) showSubtitle(text);
        });

        return () => {
            if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
            sock.disconnect();
            socketRef.current = null;
            setSocketConnected(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const addLog = useCallback((msg: string) => {
        const time = new Date().toLocaleTimeString("vi-VN", { hour12: false });
        setStatusLog(prev => [`[${time}] ${msg}`, ...prev].slice(0, 80));
    }, []);

    const showSubtitle = useCallback((text: string) => {
        console.log("Subtitle: ", text);
        setSubtitle(text);
        if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
        subtitleTimerRef.current = setTimeout(() => setSubtitle(""), 5000);
    }, []);

    const addChunk = useCallback(async (blob: Blob, stopReason: StopReason) => {
        const rms = await computeRms(blob);
        const passed = rms >= RMS_THRESHOLD;
        const duration = Date.now() - chunkStartRef.current;

        const chunk: AudioChunk = {
            id: ++chunkIdRef.current,
            blob,
            url: URL.createObjectURL(blob),
            timestamp: Date.now(),
            duration,
            sizeBytes: blob.size,
            rms,
            passed,
            stopReason,
        };

        if (passed) {
            addLog(`✅ Chunk #${chunk.id} | ${formatBytes(blob.size)} | RMS=${rms.toFixed(4)} | ${stopReason} | ${duration}ms → 📡 Đang gửi backend...`);
            setChunks(prev => [chunk, ...prev]);

            // Gửi qua socket đến backend, backend gọi AI rồi trả về chỉ cho client này
            const sock = socketRef.current;
            if (sock?.connected) {
                const arrayBuffer = await blob.arrayBuffer();
                sock.emit("transcribe-audio", {
                    audio: arrayBuffer,
                    language: language === "auto" ? undefined : language,
                });
            } else {
                addLog(`⚠️ Chunk #${chunk.id} — Socket chưa kết nối, bỏ qua`);
            }
        } else {
            addLog(`🔇 Chunk #${chunk.id} bị lọc (RMS=${rms.toFixed(4)} < ${RMS_THRESHOLD}) | ${stopReason}`);
        }
    }, [addLog, showSubtitle, language]);

    const stopVAD = useCallback(() => {
        if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        if (maxDurationTimerRef.current) { clearTimeout(maxDurationTimerRef.current); maxDurationTimerRef.current = null; }
        if (recorderRef.current?.state === "recording") {
            stopReasonRef.current = "manual";
            recorderRef.current.stop();
        }
        recorderRef.current = null;
        isRecordingRef.current = false;
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        analyserRef.current = null;
        micStreamRef.current?.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
        lastLoggedSpeakingRef.current = null;
        setCurrentState("idle");
        setAvgFreq(0);
    }, []);

    const startVAD = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                // audio: {
                //     echoCancellation: true,
                //     noiseSuppression: true,
                //     autoGainControl: true,
                // },
                audio: true,
                video: false
            });
            micStreamRef.current = stream;
            addLog("🎤 Mic được cấp quyền, bắt đầu VAD engine...");

            const audioCtx = new AudioContext();
            audioCtxRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const startRecording = () => {
                if (isRecordingRef.current) return;
                addLog("🎙️ Bắt đầu ghi âm chunk mới");
                chunkStartRef.current = Date.now();

                const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
                recorderRef.current = recorder;
                isRecordingRef.current = true;

                recorder.ondataavailable = async (e) => {
                    if (e.data.size === 0) {
                        addLog("⚠️ ondataavailable: chunk rỗng (size=0)");
                        return;
                    }
                    addLog(`📦 ondataavailable: ${formatBytes(e.data.size)}, đang xử lý...`);
                    await addChunk(e.data, stopReasonRef.current);
                };

                recorder.onstop = () => {
                    isRecordingRef.current = false;
                    if (maxDurationTimerRef.current) {
                        clearTimeout(maxDurationTimerRef.current);
                        maxDurationTimerRef.current = null;
                    }
                };

                recorder.start();
                addLog("▶️ recorder.start()");

                maxDurationTimerRef.current = setTimeout(() => {
                    if (recorderRef.current?.state === "recording") {
                        addLog(`⏰ Đạt MAX_CHUNK_DURATION (${MAX_CHUNK_DURATION_MS}ms) → force stop`);
                        stopReasonRef.current = "max-duration";
                        recorderRef.current.stop();
                    }
                }, MAX_CHUNK_DURATION_MS);
            };

            const flushChunk = () => {
                addLog(`🔕 flushChunk() — im lặng ${SILENCE_DURATION_MS}ms, cắt chunk`);
                if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
                if (recorderRef.current?.state === "recording") {
                    stopReasonRef.current = "silence";
                    recorderRef.current.stop();
                }
            };

            pollIntervalRef.current = setInterval(() => {
                analyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                setAvgFreq(Math.round(avg * 10) / 10);

                const isSpeaking = avg > SPEAKING_THRESHOLD;

                if (isSpeaking !== lastLoggedSpeakingRef.current) {
                    addLog(isSpeaking
                        ? `🎤 ĐANG NÓI (avg=${avg.toFixed(1)})`
                        : `😶 IM LẶNG (avg=${avg.toFixed(1)})`
                    );
                    lastLoggedSpeakingRef.current = isSpeaking;
                    setCurrentState(isSpeaking ? "speaking" : "silence-wait");
                }

                if (isSpeaking) {
                    if (silenceTimerRef.current) {
                        clearTimeout(silenceTimerRef.current);
                        silenceTimerRef.current = null;
                    }
                    startRecording();
                } else {
                    if (isRecordingRef.current && !silenceTimerRef.current) {
                        silenceTimerRef.current = setTimeout(() => {
                            flushChunk();
                            silenceTimerRef.current = null;
                        }, SILENCE_DURATION_MS);
                    }
                }
            }, POLL_INTERVAL_MS);

        } catch (err) {
            addLog(`❌ Lỗi: ${err instanceof Error ? err.message : String(err)}`);
            setIsRunning(false);
        }
    }, [addChunk, addLog]);

    const handleToggle = useCallback(() => {
        if (isRunning) {
            stopVAD();
            setIsRunning(false);
            addLog("⏹️ Dừng VAD engine");
        } else {
            setChunks([]);
            setStatusLog([]);
            setIsRunning(true);
            addLog("🚀 Khởi động VAD engine...");
            void startVAD();
        }
    }, [isRunning, startVAD, stopVAD, addLog]);

    const handleClearChunks = () => {
        chunks.forEach(c => URL.revokeObjectURL(c.url));
        setChunks([]);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => { stopVAD(); };
    }, [stopVAD]);

    // ── UI ────────────────────────────────────────────────────────────────────
    const stateColor = {
        idle: "#6b7280",
        speaking: "#22c55e",
        "silence-wait": "#f59e0b",
    }[currentState];

    const stateLabel = {
        idle: "Chờ",
        speaking: "Đang nói",
        "silence-wait": "Đợi im lặng...",
    }[currentState];

    return (
        <div style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
            color: "#e2e8f0",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            padding: "0",
        }}>
            {/* Subtitle display — fixed bottom bar */}
            {subtitle && (
                <div style={{
                    position: "fixed",
                    bottom: "28px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 9999,
                    maxWidth: "80vw",
                    padding: "14px 28px",
                    borderRadius: "16px",
                    background: "rgba(0,0,0,0.78)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(99,102,241,0.4)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    color: "#fff",
                    fontSize: "20px",
                    fontWeight: 600,
                    textAlign: "center",
                    lineHeight: 1.5,
                    animation: "subtitleFadeIn 0.25s ease",
                }}>
                    {subtitle}
                </div>
            )}

            {/* Header */}
            <div style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                padding: "16px 32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "24px" }}>🔬</span>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#fff" }}>
                            Subtitle Audio Chunk Debugger
                        </h1>
                        <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
                            Thu âm theo cơ chế VAD — gửi chunk đến AI server & hiển thị subtitle
                        </p>
                    </div>
                </div>

                {/* Socket status badge */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    background: socketConnected ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                    border: `1px solid ${socketConnected ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                    fontSize: "13px",
                    fontWeight: 500,
                    color: socketConnected ? "#4ade80" : "#f87171",
                }}>
                    <div style={{
                        width: "8px", height: "8px", borderRadius: "50%",
                        background: socketConnected ? "#22c55e" : "#ef4444",
                        boxShadow: socketConnected ? "0 0 6px #22c55e" : "none",
                    }} />
                    {socketConnected ? "🔌 Backend connected" : "🔌 Backend disconnected"}
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "0", minHeight: "calc(100vh - 65px)" }}>

                {/* ── Left Panel: Controls + Log ── */}
                <div style={{
                    background: "rgba(0,0,0,0.3)",
                    borderRight: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0",
                }}>
                    {/* Controls */}
                    <div style={{ padding: "24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <h2 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            Điều khiển
                        </h2>

                        {/* Language Selector */}
                        <div style={{ marginBottom: "12px" }}>
                            <label style={{
                                display: "block",
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#94a3b8",
                                marginBottom: "6px",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                            }}>
                                Ngôn ngữ nhận dạng
                            </label>
                            <select
                                id="select-language"
                                value={language}
                                onChange={e => setLanguage(e.target.value)}
                                disabled={isRunning}
                                style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    background: "rgba(255,255,255,0.06)",
                                    color: "#e2e8f0",
                                    fontSize: "14px",
                                    cursor: isRunning ? "not-allowed" : "pointer",
                                    outline: "none",
                                    appearance: "none",
                                    WebkitAppearance: "none",
                                }}
                            >
                                {LANGUAGES.map(l => (
                                    <option key={l.value} value={l.value} style={{ background: "#1e1b4b" }}>
                                        {l.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Big Toggle Button */}
                        <button
                            id="btn-toggle-vad"
                            onClick={handleToggle}
                            style={{
                                width: "100%",
                                padding: "14px",
                                borderRadius: "12px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "16px",
                                fontWeight: 700,
                                transition: "all 0.2s",
                                background: isRunning
                                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                                    : "linear-gradient(135deg, #6366f1, #4f46e5)",
                                color: "#fff",
                                boxShadow: isRunning
                                    ? "0 4px 20px rgba(239,68,68,0.4)"
                                    : "0 4px 20px rgba(99,102,241,0.4)",
                            }}
                        >
                            {isRunning ? "⏹ Dừng ghi âm" : "▶ Bắt đầu ghi âm"}
                        </button>

                        {/* Status Indicator */}
                        {isRunning && (
                            <div style={{
                                marginTop: "16px",
                                padding: "12px 16px",
                                borderRadius: "10px",
                                background: "rgba(255,255,255,0.05)",
                                border: `1px solid ${stateColor}44`,
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div style={{
                                        width: "10px",
                                        height: "10px",
                                        borderRadius: "50%",
                                        background: stateColor,
                                        boxShadow: `0 0 8px ${stateColor}`,
                                        animation: currentState === "speaking" ? "pulse 1s infinite" : "none",
                                    }} />
                                    <span style={{ fontWeight: 600, color: stateColor, fontSize: "14px" }}>{stateLabel}</span>
                                </div>

                                {/* Frequency bar */}
                                <div>
                                    <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>
                                        Avg Frequency: {avgFreq} / threshold: {SPEAKING_THRESHOLD}
                                    </div>
                                    <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                                        <div style={{
                                            height: "100%",
                                            width: `${Math.min(100, (avgFreq / 50) * 100)}%`,
                                            background: avgFreq > SPEAKING_THRESHOLD
                                                ? "linear-gradient(90deg,#22c55e,#16a34a)"
                                                : "linear-gradient(90deg,#6366f1,#4f46e5)",
                                            transition: "width 0.1s",
                                            borderRadius: "3px",
                                        }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Params */}
                        <div style={{
                            marginTop: "16px",
                            padding: "12px",
                            borderRadius: "8px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            fontSize: "12px",
                            color: "#64748b",
                        }}>
                            <div style={{ fontWeight: 600, color: "#94a3b8", marginBottom: "8px" }}>Tham số VAD</div>
                            {[
                                ["SPEAKING_THRESHOLD", SPEAKING_THRESHOLD],
                                ["SILENCE_DURATION_MS", `${SILENCE_DURATION_MS}ms`],
                                ["MAX_CHUNK_DURATION_MS", `${MAX_CHUNK_DURATION_MS}ms`],
                                ["POLL_INTERVAL_MS", `${POLL_INTERVAL_MS}ms`],
                                ["RMS_THRESHOLD", RMS_THRESHOLD],
                            ].map(([k, v]) => (
                                <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                    <span>{k}</span>
                                    <span style={{ color: "#e2e8f0", fontFamily: "monospace" }}>{String(v)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Log */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <div style={{
                            padding: "12px 24px",
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                Log
                            </span>
                            <button
                                onClick={() => setStatusLog([])}
                                style={{ fontSize: "11px", color: "#475569", background: "none", border: "none", cursor: "pointer" }}
                            >
                                Xóa
                            </button>
                        </div>
                        <div style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "12px 16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "3px",
                            fontFamily: "monospace",
                            fontSize: "11px",
                        }}>
                            {statusLog.length === 0 && (
                                <span style={{ color: "#475569", fontStyle: "italic" }}>Chưa có log...</span>
                            )}
                            {statusLog.map((log, i) => {
                                const color = log.includes("❌") ? "#f87171"
                                    : log.includes("✅") ? "#4ade80"
                                        : log.includes("🔇") ? "#94a3b8"
                                            : log.includes("🎤 ĐANG") ? "#22c55e"
                                                : log.includes("😶") ? "#f59e0b"
                                                    : log.includes("🚀") ? "#818cf8"
                                                        : "#cbd5e1";
                                return (
                                    <div key={i} style={{ color, lineHeight: "1.5" }}>{log}</div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Right Panel: Chunks ── */}
                <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    {/* Chunks header */}
                    <div style={{
                        padding: "16px 24px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(255,255,255,0.02)",
                    }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#fff" }}>
                                Audio Chunks
                            </h2>
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                                {chunks.length} chunk(s) đã lưu (đã qua lọc RMS)
                            </p>
                        </div>
                        {chunks.length > 0 && (
                            <button
                                id="btn-clear-chunks"
                                onClick={handleClearChunks}
                                style={{
                                    padding: "6px 14px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(248,113,113,0.4)",
                                    background: "rgba(248,113,113,0.1)",
                                    color: "#f87171",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                }}
                            >
                                Xóa tất cả
                            </button>
                        )}
                    </div>

                    {/* Chunks list */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
                        {chunks.length === 0 ? (
                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "200px",
                                color: "#475569",
                                gap: "8px",
                            }}>
                                <span style={{ fontSize: "40px" }}>🎧</span>
                                <span>Chưa có chunk nào. Hãy bắt đầu ghi âm và nói chuyện.</span>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {chunks.map((chunk) => (
                                    <ChunkCard key={chunk.id} chunk={chunk} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                * { box-sizing: border-box; }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes subtitleFadeIn {
                    from { opacity: 0; transform: translateX(-50%) translateY(8px); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
                audio { width: 100%; height: 36px; }
                audio::-webkit-media-controls-panel { background: rgba(255,255,255,0.08); }
            `}</style>
        </div>
    );
}

// ─── ChunkCard Component ───────────────────────────────────────────────────────
function ChunkCard({ chunk }: { chunk: AudioChunk }) {
    const reasonColor: Record<StopReason, string> = {
        silence: "#a78bfa",
        "max-duration": "#f59e0b",
        manual: "#94a3b8",
    };
    const reasonLabel: Record<StopReason, string> = {
        silence: "🔕 Silence",
        "max-duration": "⏰ Max duration",
        manual: "⏹ Manual",
    };

    return (
        <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            padding: "16px",
            transition: "border-color 0.2s",
        }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
        >
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#fff",
                    }}>
                        #{chunk.id}
                    </span>
                    <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>
                            chunk_{String(chunk.id).padStart(3, "0")}.webm
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {formatTime(chunk.timestamp)}
                        </div>
                    </div>
                </div>

                <a
                    id={`btn-download-chunk-${chunk.id}`}
                    href={chunk.url}
                    download={`chunk_${String(chunk.id).padStart(3, "0")}.webm`}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 14px",
                        borderRadius: "8px",
                        background: "linear-gradient(135deg,#22c55e,#16a34a)",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 600,
                        textDecoration: "none",
                        boxShadow: "0 2px 10px rgba(34,197,94,0.3)",
                        transition: "opacity 0.2s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                    ⬇ Tải xuống
                </a>
            </div>

            {/* Metadata pills */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                {[
                    { label: formatBytes(chunk.sizeBytes), color: "#6366f1" },
                    { label: `${chunk.duration}ms`, color: "#06b6d4" },
                    { label: `RMS ${chunk.rms.toFixed(4)}`, color: chunk.rms >= RMS_THRESHOLD ? "#22c55e" : "#ef4444" },
                    { label: reasonLabel[chunk.stopReason], color: reasonColor[chunk.stopReason] },
                ].map(({ label, color }) => (
                    <span key={label} style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 500,
                        background: `${color}18`,
                        border: `1px solid ${color}40`,
                        color,
                    }}>
                        {label}
                    </span>
                ))}
            </div>

            {/* Audio player */}
            <audio controls src={chunk.url} preload="metadata" />
        </div>
    );
}
