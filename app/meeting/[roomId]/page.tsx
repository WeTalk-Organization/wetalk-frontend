"use client";

import { useAuth } from "@/hooks/useAuth";
import { meetingService } from "@/services/meeting.service";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MeetingResponse } from "@/types/meeting";
import { MessageSquare, Mic, MicOff, Video, Copy, Check, VideoOff, ChevronLeft, ChevronRight, PhoneOff } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { useWebRTC } from "@/hooks/useWebRTC";
import VideoTile from "@/components/meeting/VideoTile";
import { Toaster } from "react-hot-toast";
import { useMeetingParticipants } from "@/hooks/useMeetingParticipan";
import MeetingEndedModal from "@/components/meeting/MeetingEndedModal";
import * as mediasoupClient from 'mediasoup-client';
import ChatBox from "@/components/chat/ChatBox";

export default function MeetingRoom() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;
    const [meeting, setMeeting] = useState<MeetingResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isMeetingEnded, setIsMeetingEnded] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const { socket } = useSocket(roomId);
    const { user } = useAuth();
    const { remoteStreams, produceMedia } = useWebRTC(socket, roomId, user ?? undefined);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const videoProducerRef = useRef<mediasoupClient.types.Producer | null>(null);
    const audioProducerRef = useRef<mediasoupClient.types.Producer | null>(null);

    const [localVideoEnabled, setLocalVideoEnabled] = useState(false);
    const [localAudioEnabled, setLocalAudioEnabled] = useState(false);
    const [micStream, setMicStream] = useState<MediaStream | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const meetingUrl = typeof window !== "undefined"
        ? `${window.location.origin}/meeting/${meeting?.roomId}`
        : "";

    const { participants } = useMeetingParticipants(socket, meeting?.participants);

    const handleToggleVideo = async () => {
        if (!localVideoEnabled) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                setLocalStream(stream);
                setLocalVideoEnabled(true);
                const videoTrack = stream.getVideoTracks()[0];
                const producer = await produceMedia(videoTrack);
                videoProducerRef.current = producer;
            }
            catch (error) {
                console.error("Lỗi khi bật camera:", error);
            }
        }
        else {
            localStream?.getTracks().forEach(track => track.stop());
            setLocalStream(null);
            setLocalVideoEnabled(false);

            if (videoProducerRef.current) {
                videoProducerRef.current.close();
                socket?.emit("closeProducer", {
                    roomId,
                    producerId: videoProducerRef.current.id
                });
                videoProducerRef.current = null;
            }
        }
    }

    const handleToggleMic = async () => {
        if (!localAudioEnabled) {
            try {
                if (!audioProducerRef.current) {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                    setMicStream(stream);
                    const audioTrack = stream.getAudioTracks()[0];
                    const producer = await produceMedia(audioTrack);
                    audioProducerRef.current = producer;

                }
                else {
                    if (audioProducerRef.current.track) {
                        audioProducerRef.current.track.enabled = true;
                    }
                    socket?.emit('resumeProducer', {
                        roomId,
                        producerId: audioProducerRef.current.id
                    });
                }
                setLocalAudioEnabled(true);

            } catch (error) {
                console.error("Lỗi khi bật mic:", error);
            }
        } else {
            if (audioProducerRef.current) {
                if (audioProducerRef.current.track) {
                    audioProducerRef.current.track.enabled = false;
                }
                socket?.emit('pauseProducer', {
                    roomId,
                    producerId: audioProducerRef.current.id
                });
            }
            setLocalAudioEnabled(false);
        }
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(meetingUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLeaveMeeting = async () => {
        try {
            setIsLeaving(true);
            localStream?.getTracks().forEach(t => t.stop());
            micStream?.getTracks().forEach(t => t.stop());
            await meetingService.leave(roomId);
        } catch (error) {
            console.error("Lỗi khi rời phòng:", error);
        } finally {
            setIsLeaving(false);
            router.push("/");
        }
    };

    useEffect(() => {
        if (!roomId) return;
        meetingService
            .join(roomId)
            .then((res) => {
                console.log('partData: ', res.data);
                setMeeting(res.data);
            })
            .catch((err) => {
                console.error("Lỗi khi tham gia phòng:", err);
                setError("Phòng họp không tồn tại, đã kết thúc hoặc bạn không có quyền.");
            });
    }, [roomId]);


    useEffect(() => {
        const unlockAudio = () => {
            document.querySelectorAll('audio').forEach(el => {
                if (el.paused && el.srcObject) {
                    el.play().catch(() => { });
                }
            });
            document.removeEventListener('click', unlockAudio);
        };
        document.addEventListener('click', unlockAudio);
        return () => document.removeEventListener('click', unlockAudio);
    }, []);

    useEffect(() => {
        if (!socket) return;
        socket.on('meeting-ended', () => {
            localStream?.getTracks().forEach(t => t.stop());
            micStream?.getTracks().forEach(t => t.stop());
            setIsMeetingEnded(true);
        });
        return () => { socket.off('meeting-ended'); };
    }, [socket, localStream, micStream]);

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a1a] text-white">
                <p className="text-lg text-red-400">{error}</p>
                <button
                    onClick={() => router.push("/")}
                    className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold cursor-pointer hover:bg-violet-500"
                >
                    Về trang chủ
                </button>
            </div>
        );
    }

    if (!meeting) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a] text-white">
                <p>Đang tải phòng họp...</p>
            </div>
        );
    }

    const currentUserId = user?.id;
    const remoteParticipants = participants.filter(p => p.userId !== currentUserId);

    const allTiles = [
        <VideoTile
            key="local-user"
            name={"Bạn"}
            avatar={user?.avatar}
            videoEnabled={localVideoEnabled}
            stream={localStream}
            isLocal={true}
        />,

        ...remoteParticipants.map(p => {
            const remoteEntry = Array.from(remoteStreams.entries()).find(([, data]) =>
                data.userId === p.userId
            );
            const stream = remoteEntry?.[1]?.stream ?? null;
            return (
                <VideoTile
                    key={`remote-${p.userId}`}
                    name={`${p.firstName} ${p.lastName}`}
                    avatar={p.avatar}
                    videoEnabled={p.videoEnabled || stream !== null}
                    stream={stream}
                    isLocal={false}
                />
            );
        }),
    ];

    const tilesPerPage = 4;
    const totalPages = Math.ceil(allTiles.length / tilesPerPage);
    const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
    const startIndex = (validCurrentPage - 1) * tilesPerPage;
    const currentTiles = allTiles.slice(startIndex, startIndex + tilesPerPage);

    return (
        <div className="flex h-screen flex-col bg-[#0a0a1a] text-white overflow-hidden">
            {isMeetingEnded && (
                <MeetingEndedModal onGoHome={() => router.push('/')} />
            )}
            <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-bold">Phòng họp</h1>
                    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
                        <span className="text-sm text-zinc-400 max-w-[300px] truncate">
                            {meetingUrl}
                        </span>
                        <button
                            onClick={handleCopy}
                            className="cursor-pointer text-zinc-400 hover:text-white transition-colors"
                        >
                            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </header>

            <Toaster position="bottom-left" reverseOrder={false} />

            <div className="flex flex-1 min-h-0 items-center justify-center p-6 w-full relative overflow-hidden flex-row">
                <div className="flex-1 w-full h-full relative group flex items-center justify-center transition-all duration-300">
                    {totalPages > 1 && (
                        <button
                            onClick={() => setCurrentPage(validCurrentPage - 1)}
                            disabled={validCurrentPage === 1}
                            className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-all hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed z-10 opacity-0 group-hover:opacity-100"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                    )}

                    <div
                        className={`w-[85%] max-w-[1600px] mx-auto h-full min-h-[75vh] gap-4 ${currentTiles.length === 1 ? 'flex items-center justify-center' : 'grid px-10'}`}
                        style={currentTiles.length === 1 ? {} : {
                            gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(currentTiles.length || 1))}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${Math.ceil(currentTiles.length / Math.ceil(Math.sqrt(currentTiles.length || 1)))}, minmax(0, 1fr))`,
                        }}
                    >
                        {currentTiles.length > 0 ? (
                            currentTiles.length === 1 ? (
                                <div className="aspect-video w-full max-w-5xl max-h-full relative">
                                    {currentTiles[0]}
                                </div>
                            ) : currentTiles
                        ) : (
                            <div className="flex w-full max-w-3xl aspect-video items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                                <p className="text-zinc-500">Chưa có ai trong phòng</p>
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <button
                            onClick={() => setCurrentPage(validCurrentPage + 1)}
                            disabled={validCurrentPage === totalPages}
                            className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-all hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed z-10 opacity-0 group-hover:opacity-100"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    )}

                    {totalPages > 1 && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`h-2 rounded-full transition-all ${validCurrentPage === i + 1 ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
                                />
                            ))}
                        </div>
                    )}
                </div>


                {user && (
                    <div
                        className={`shrink-0 self-stretch flex overflow-hidden transition-all duration-500 ease-in-out ${isChatOpen
                            ? "ml-6 w-[350px] opacity-100 translate-x-0"
                            : "ml-0 w-0 opacity-0 translate-x-10 pointer-events-none"
                            }`}
                    >
                        <div className="w-[350px] min-w-[350px] h-full shrink-0 py-4">
                            <ChatBox
                                socket={socket}
                                roomId={roomId}
                                currentUser={user}
                            />
                        </div>
                    </div>
                )}
            </div>


            <div className="flex items-center justify-center gap-4 border-t border-white/10 py-4">
                <button
                    onClick={handleToggleMic}
                    className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-all ${localAudioEnabled ? "bg-violet-600 hover:bg-violet-500" : "bg-red-500 hover:bg-red-600"}`}
                >
                    {localAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-white" />}
                    <span className="absolute bottom-[120%] left-1/2 -translate-x-1/2 rounded-md bg-[#2B2D36]/90 px-3 py-1.5 text-[13px] font-medium text-white opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100 whitespace-nowrap pointer-events-none border border-white/10 shadow-lg backdrop-blur-md z-50">
                        {localAudioEnabled ? "Tắt micro" : "Bật micro"}
                    </span>
                </button>

                <button
                    onClick={handleToggleVideo}
                    className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-all ${localVideoEnabled ? "bg-violet-600 hover:bg-violet-500" : "bg-red-500 hover:bg-red-600"}`}
                >
                    {localVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5 text-white" />}
                    <span className="absolute bottom-[120%] left-1/2 -translate-x-1/2 rounded-md bg-[#2B2D36]/90 px-3 py-1.5 text-[13px] font-medium text-white opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100 whitespace-nowrap pointer-events-none border border-white/10 shadow-lg backdrop-blur-md z-50">
                        {localVideoEnabled ? "Tắt camera" : "Bật camera"}
                    </span>
                </button>

                <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-all ${isChatOpen ? "bg-violet-600 hover:bg-violet-500" : "bg-white/10 hover:bg-white/20"}`}
                >
                    <MessageSquare className="h-5 w-5" />
                    <span className="absolute bottom-[120%] left-1/2 -translate-x-1/2 rounded-md bg-[#2B2D36]/90 px-3 py-1.5 text-[13px] font-medium text-white opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100 whitespace-nowrap pointer-events-none border border-white/10 shadow-lg backdrop-blur-md z-50">
                        {isChatOpen ? "Đóng chat" : "Mở chat"}
                    </span>
                </button>

                <button
                    onClick={handleLeaveMeeting}
                    disabled={isLeaving}
                    className="group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-red-600 transition-all hover:bg-red-500 disabled:opacity-50"
                >
                    <PhoneOff className={`h-5 w-5 ${isLeaving ? 'animate-pulse opacity-50' : ''}`} />
                    <span className="absolute bottom-[120%] left-1/2 -translate-x-1/2 rounded-md bg-red-600/90 px-3 py-1.5 text-[13px] font-medium text-white opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100 whitespace-nowrap pointer-events-none border border-red-500/30 shadow-[0_0_15px_rgba(220,38,38,0.3)] backdrop-blur-md z-50">
                        Rời phòng
                    </span>
                </button>
            </div>

        </div>
    );
}
