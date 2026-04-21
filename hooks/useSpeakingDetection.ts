import { useEffect, useRef, useState } from "react";

const SPEAKING_THRESHOLD = 10;
const POLL_INTERVAL_MS = 100;

type RemoteStreams = Map<string, { userId?: string; stream: MediaStream; socketId?: string }>;

interface UseSpeakingDetectionOptions {
    localStream: MediaStream | null;
    localAudioEnabled: boolean;
    currentUserId: string | undefined;
    remoteStreams: RemoteStreams;
}

export function useSpeakingDetection({
    localStream,
    localAudioEnabled,
    currentUserId,
    remoteStreams
}: UseSpeakingDetectionOptions): Set<string> {
    const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set())
    const analysersRef = useRef<Map<string,
        {
            analyser: AnalyserNode;
            context: AudioContext;
            interval: ReturnType<typeof setInterval>
        }>>(new Map());

    useEffect(() => {
        const cleanup = () => {
            analysersRef.current.forEach(({ context, interval }) => {
                clearInterval(interval);
                context.close();
            });
            analysersRef.current.clear();
            setSpeakingUsers(new Set());
        };

        cleanup();

        const setupAnalyser = (userId: string, stream: MediaStream) => {
            try {
                const context = new AudioContext();
                const source = context.createMediaStreamSource(stream);
                const analyser = context.createAnalyser();
                analyser.fftSize = 512;
                source.connect(analyser);

                const dataArray = new Uint8Array(analyser.frequencyBinCount);

                const interval = setInterval(() => {
                    analyser.getByteFrequencyData(dataArray);
                    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                    setSpeakingUsers(prev => {
                        const next = new Set(prev);
                        if (avg > SPEAKING_THRESHOLD) {
                            next.add(userId);
                        } else {
                            next.delete(userId);
                        }
                        return next;
                    })
                }, POLL_INTERVAL_MS);

                analysersRef.current.set(userId, { analyser, context, interval });

            } catch (err) {
                console.warn("useSpeakingDetection error:", err);
            }
        };

        if (localStream && localAudioEnabled && currentUserId) {
            setupAnalyser(currentUserId, localStream);
        }

        remoteStreams.forEach(({ userId, stream }) => {
            if (userId && stream.getAudioTracks().length > 0) {
                setupAnalyser(userId, stream);
            }
        });

        return cleanup;
    }, [localStream, localAudioEnabled, currentUserId, remoteStreams])

    return speakingUsers;
}