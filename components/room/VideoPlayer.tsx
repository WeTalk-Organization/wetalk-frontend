import { VideoPlayerProps } from "@/types/media";
import { useEffect, useRef } from "react";

export default function VideoPlayer({ stream }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream])

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover rounded-2xl shadow-lg"
        />
    );
}