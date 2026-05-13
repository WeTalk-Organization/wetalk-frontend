import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";


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
    } catch (err) {
        console.error("[Subtitle] Lỗi khi decodeAudioData:", err);
        return 0;
    } finally {
        try {
            await audioCtx.close();
        } catch (closeErr) {
            console.error("[Subtitle] Lỗi khi đóng AudioContext:", closeErr);
        }
    }
}

const RMS_THRESHOLD = 0.01;
const SPEAKING_THRESHOLD = 30;
const SILENCE_DURATION_MS = 700;
const MAX_CHUNK_DURATION_MS = 8000;
const POLL_INTERVAL_MS = 100;


interface UseSubtitleOptions {
    socket: Socket | null;
    roomId: string;
    micStream: MediaStream | null;
    localAudioEnabled: boolean;
    currentUserId?: string;
    language?: string;
    enabled: boolean;
}

interface SubtitlePayload {
    userId: string;
    text: string;
    timestamp: number;
}

export function useSubtitle({
    socket,
    roomId,
    micStream,
    localAudioEnabled,
    enabled,
    language,
}: UseSubtitleOptions): Map<string, string> {
    const [subtitleMap, setSubtitleMap] = useState<Map<string, string>>(new Map());

    const recorderRef = useRef<MediaRecorder | null>(null);
    const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const isSpeakingRef = useRef(false);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!micStream || !localAudioEnabled || !socket) {
            if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
            if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
            if (maxDurationTimerRef.current) { clearTimeout(maxDurationTimerRef.current); maxDurationTimerRef.current = null; }
            if (recorderRef.current?.state === "recording") recorderRef.current.stop();
            recorderRef.current = null;
            audioCtxRef.current?.close();
            audioCtxRef.current = null;
            analyserRef.current = null;
            return;
        }

        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(micStream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const recorder = new MediaRecorder(micStream, { mimeType: "audio/webm" });
        recorderRef.current = recorder;

        recorder.ondataavailable = async (e) => {
            if (e.data.size === 0) {
                console.log("[Subtitle] ⚠️ ondataavailable: chunk rỗng (size=0), bỏ qua");
                return;
            }

            console.log(`[Subtitle] 📦 ondataavailable: chunk size=${e.data.size} bytes, đang tính RMS...`);
            const rms = await computeRms(e.data);
            console.log(`[Subtitle] 🔊 RMS=${rms.toFixed(4)} (threshold=${RMS_THRESHOLD})`);
            if (rms < RMS_THRESHOLD) {
                console.log("[Subtitle] 🔇 RMS quá thấp → bỏ qua chunk (im lặng)");
                return;
            }
            const arrayBuffer = await e.data.arrayBuffer();
            console.log(`[Subtitle] 🚀 Gửi chunk lên server: ${arrayBuffer.byteLength} bytes, language=${language}`);
            socket.emit("send-subtitle", { roomId, audio: arrayBuffer, language });
        }
        recorder.start();
        console.log("[Subtitle] ▶️ recorder.start() — ghi liên tục, chờ VAD...");


        const flushChunk = () => {
            console.log("[Subtitle] 🔕 flushChunk() — cắt chunk");
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            if (maxDurationTimerRef.current) {
                clearTimeout(maxDurationTimerRef.current);
                maxDurationTimerRef.current = null;
            }
            if (recorderRef.current?.state === "recording") {
                recorderRef.current.stop();
                recorderRef.current.start();
                isSpeakingRef.current = false;
            }

        };

        let _lastLoggedSpeaking: boolean | null = null;
        let silenceAccumulator = 0; // Thêm biến tích lũy thời gian im lặng

        pollIntervalRef.current = setInterval(() => {
            analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            const isSpeaking = avg > SPEAKING_THRESHOLD;

            // Chỉ log khi trạng thái thay đổi để tránh spam console
            if (isSpeaking !== _lastLoggedSpeaking) {
                console.log(`[Subtitle] 🎤 Trạng thái: ${isSpeaking ? "ĐANG NÓI (avg=" + avg.toFixed(1) + ")" : "IM LẶNG (avg=" + avg.toFixed(1) + ")"}`);
                _lastLoggedSpeaking = isSpeaking;
            }

            if (isSpeaking) {
                if (!isSpeakingRef.current) {
                    isSpeakingRef.current = true;


                    if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
                    maxDurationTimerRef.current = setTimeout(() => {
                        console.log(`[Subtitle] ⏱️ Phát hiện nói liên tục quá ${MAX_CHUNK_DURATION_MS}ms, ngắt chunk sớm!`);
                        flushChunk();
                    }, MAX_CHUNK_DURATION_MS);
                }

                silenceAccumulator = 0; // Reset bộ đếm im lặng khi có giọng nói

                if (silenceTimerRef.current) {
                    console.log("[Subtitle] 🔄 Nói lại → huỷ silence timer");
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
            } else {
                if (isSpeakingRef.current && !silenceTimerRef.current) {
                    console.log(`[Subtitle] ⏳ Bắt đầu silence timer (${SILENCE_DURATION_MS}ms)...`);
                    silenceTimerRef.current = setTimeout(() => {
                        flushChunk();
                        silenceTimerRef.current = null;
                    }, SILENCE_DURATION_MS);
                }

                // FIX 2: Chủ động xả buffer định kỳ khi người dùng đang im lặng
                if (!isSpeakingRef.current) {
                    silenceAccumulator += POLL_INTERVAL_MS;
                    if (silenceAccumulator >= 1000) {
                        if (recorderRef.current?.state === "recording") {
                            recorderRef.current.stop();
                            recorderRef.current.start();
                        }
                        silenceAccumulator = 0;
                    }
                }
            }
        }, POLL_INTERVAL_MS);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }

            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }

            if (maxDurationTimerRef.current) {
                clearTimeout(maxDurationTimerRef.current);
                maxDurationTimerRef.current = null;
            }

            if (recorderRef.current?.state === "recording") {
                recorderRef.current.stop();
            }
            recorderRef.current = null;
            audioCtxRef.current?.close();
            isSpeakingRef.current = false;
            audioCtxRef.current = null;
            analyserRef.current = null;
        }
    }, [micStream, localAudioEnabled, socket, roomId, language]);

    //listen event from server
    useEffect(() => {
        if (!socket) return;

        const handleSubtitle = ({ userId, text }: SubtitlePayload) => {
            console.log("subtitle: ", text);
            const oldTimer = timeoutRefs.current.get(userId);
            if (oldTimer) clearTimeout(oldTimer);

            setSubtitleMap(prev => {
                const next = new Map(prev);
                next.set(userId, text);
                return next;
            });

            const timer = setTimeout(() => {
                setSubtitleMap(prev => {
                    const next = new Map(prev);
                    next.delete(userId);
                    return next;
                });
                timeoutRefs.current.delete(userId);
            }, 5000);

            timeoutRefs.current.set(userId, timer);
        };

        socket.on("receive-subtitle", handleSubtitle);
        return () => {
            socket.off("receive-subtitle", handleSubtitle);
        }
    }, [socket]);

    return enabled ? subtitleMap : new Map();
}
