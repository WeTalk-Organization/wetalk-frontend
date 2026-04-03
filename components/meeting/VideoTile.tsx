import Image from "next/image";
import VideoPlayer from "@/components/meeting/VideoPlayer";
import { VideoOff } from "lucide-react";
import { VideoTileProps } from "@/types/meeting";


export default function VideoTile({ name, avatarUrl, videoEnabled, stream }: VideoTileProps) {
    const hasVideo = videoEnabled && stream && stream.getVideoTracks().length > 0;

    return (
        <div className="relative h-full w-full min-h-[300px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
            {hasVideo ? (
                <VideoPlayer stream={stream!} />
            ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-zinc-800">
                    {avatarUrl ? (
                        <Image
                            src={avatarUrl}
                            alt={name}
                            width={80}
                            height={80}
                            className="h-20 w-20 rounded-full object-cover"
                        />
                    ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-600 text-2xl font-bold text-white">
                            {(name ?? "U").charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
            )}

            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-4 py-2 backdrop-blur-md z-10 w-max max-w-[90%]">
                <span className="text-base font-semibold text-white flex items-center gap-2 truncate">
                    {name}
                    {!hasVideo && <VideoOff className="h-4 w-4 text-red-400 shrink-0" />}
                </span>
            </div>
        </div>
    );
}