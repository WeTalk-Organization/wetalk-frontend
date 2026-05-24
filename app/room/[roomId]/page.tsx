"use client";

import { useAuth } from "@/hooks/useAuth";
import { roomService } from "@/services/room.service";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { followService } from "@/services/follow.service";
import type { RoomResponse } from "@/types/room";
import { MessageSquare, Mic, MicOff, Video, VideoOff, PhoneOff, Users, Captions } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { useWebRTC } from "@/hooks/useWebRTC";
import VideoTile from "@/components/room/VideoTile";
import { Toaster } from "react-hot-toast";
import { useRoomParticipants } from "@/hooks/useRoomParticipants";
import RoomEndedModal from "@/components/room/RoomEndedModal";
import KickedModal from "@/components/room/KickedModal";
import DuplicateSessionModal from "@/components/room/DuplicateSessionModal";
import ConfirmKickModal from "@/components/room/ConfirmKickModal";
import ParticipantList from "@/components/room/ParticipantList";
import UserProfileModal, { type ProfileCacheEntry } from "@/components/room/UserProfileModal";
import * as mediasoupClient from 'mediasoup-client';
import ReactionLayer from "@/components/reaction/ReactionLayer";
import { Smile } from "lucide-react";
import { useSpeakingDetection } from "@/hooks/useSpeakingDetection";

import ChatBox from "@/components/chat/ChatBox";
import { useSubtitle } from "@/hooks/useSubtitle";
import Image from "next/image";
import logo from "@/assets/images/wetalk_logo.png";

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;
    const [room, setRoom] = useState<RoomResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isRoomEnded, setIsRoomEnded] = useState(false);
    const [isKicked, setIsKicked] = useState(false);
    const [isDuplicateKicked, setIsDuplicateKicked] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isParticipantOpen, setIsParticipantOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const [kickTarget, setKickTarget] = useState<{ userId: string; name: string } | null>(null);
    const [kickStatus, setKickStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [kickError, setKickError] = useState<string>('');

    const { socket } = useSocket();
    const { user } = useAuth();
    const { remoteStreams, produceMedia } = useWebRTC(socket, roomId, user ?? undefined);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const videoProducerRef = useRef<mediasoupClient.types.Producer | null>(null);
    const audioProducerRef = useRef<mediasoupClient.types.Producer | null>(null);

    const [localVideoEnabled, setLocalVideoEnabled] = useState(false);
    const [localAudioEnabled, setLocalAudioEnabled] = useState(false);
    const [micStream, setMicStream] = useState<MediaStream | null>(null);

    const [isReactionMenuOpen, setIsReactionMenuOpen] = useState(false);

    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const profileCacheRef = useRef<Record<string, ProfileCacheEntry>>({});

    // Following IDs — fetched once, updated optimistically on follow/unfollow
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const followingFetchedRef = useRef(false);

    useEffect(() => {
        if (!user?.id || followingFetchedRef.current) return;
        followingFetchedRef.current = true;
        followService.getFollowingIds()
            .then(res => {
                setFollowingIds(new Set<string>(res.data));
            })
            .catch(err => console.error('Failed to fetch following list', err));
    }, [user?.id]);
    const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥'];

    const [isSubtitleEnabled, setIsSubtitleEnabled] = useState(false);
    const subtitleMap = useSubtitle({
        socket,
        roomId,
        micStream,
        localAudioEnabled,
        currentUserId: user?.id,
        enabled: isSubtitleEnabled,
        language: "en",
    });

    const { participants } = useRoomParticipants(socket, room?.participants);
    const speakingUsers = useSpeakingDetection({
        localStream: micStream,
        localAudioEnabled,
        currentUserId: user?.id,
        remoteStreams,
    });

    const handleToggleVideo = async () => {
        if (!localVideoEnabled) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                const videoTrack = stream.getVideoTracks()[0];
                const producer = await produceMedia(videoTrack);
                videoProducerRef.current = producer;
                setLocalStream(stream);
                setLocalVideoEnabled(true);
            }
            catch (error) {
                console.error("Error enabling camera:", error);
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
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: false,
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                        },
                    });
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
                console.error("Error enabling mic:", error);
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

    const handleLeaveRoom = async () => {
        try {
            setIsLeaving(true);
            localStream?.getTracks().forEach(t => t.stop());
            micStream?.getTracks().forEach(t => t.stop());
            socket?.emit('leave-room', { roomId });
            await roomService.leave(roomId);
        } catch (error) {
            console.error("Error leaving room:", error);
        } finally {
            setIsLeaving(false);
            router.push("/");
        }
    };

    const handleToggleParticipant = () => {
        if (!isParticipantOpen) {
            setIsChatOpen(false);
        }
        setIsParticipantOpen(prev => !prev);
    };

    const handleToggleChat = () => {
        if (!isChatOpen) {
            setUnreadCount(0);
            setIsParticipantOpen(false);
        }
        setIsChatOpen(prev => !prev);
    };

    const handleSendReaction = (emoji: string) => {
        if (!socket) return;
        socket.emit('send-reaction', { roomId, reaction: emoji });
        setIsReactionMenuOpen(false);
    };

    const initKickParticipant = (targetUserId: string, targetName: string) => {
        setKickTarget({ userId: targetUserId, name: targetName });
        setKickStatus('idle');
    };

    const confirmKickParticipant = async () => {
        if (!kickTarget) return;
        setKickStatus('loading');
        try {
            await roomService.kick(roomId, kickTarget.userId);
            setKickStatus('success');
        } catch (error) {
            const err = error as { response?: { data?: { message?: string } } };
            console.error("Error kicking user:", error);
            setKickError(err.response?.data?.message || 'Cannot kick this user out of the room');
            setKickStatus('error');
        }
    };

    const handleCloseKickModal = () => {
        setKickTarget(null);
    };

    const socketRef = useRef(socket);
    const localStreamRef = useRef(localStream);
    const micStreamRef = useRef(micStream);

    useEffect(() => { socketRef.current = socket; }, [socket]);
    useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
    useEffect(() => { micStreamRef.current = micStream; }, [micStream]);

    useEffect(() => {
        return () => {
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            micStreamRef.current?.getTracks().forEach(t => t.stop());
            if (socketRef.current) {
                socketRef.current.emit('leave-room', { roomId });
            }
        };
    }, [roomId]);

    useEffect(() => {
        if (!roomId) return;
        roomService
            .join(roomId)
            .then((res) => {
                console.log('partData: ', res.data);
                setRoom(res.data);
            })
            .catch((err) => {
                console.error("Error joining room:", err);
                setError("The room does not exist, has ended, or you do not have permission.");
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
        const handleNewMessage = () => {
            if (!isChatOpen) {
                setUnreadCount(prev => prev + 1);
            }
        };
        socket.on('receive-chat-message', handleNewMessage);
        return () => { socket.off('receive-chat-message', handleNewMessage); };
    }, [socket, isChatOpen]);

    useEffect(() => {
        if (!socket) return;
        socket.on('room-ended', () => {
            localStream?.getTracks().forEach(t => t.stop());
            micStream?.getTracks().forEach(t => t.stop());
            
            try {
                const endSound = new Audio('/sounds/end_room.mp3');
                endSound.play().catch(e => console.error('Error playing end sound:', e));
            } catch (err) {
                console.error('Audio error:', err);
            }

            setIsRoomEnded(true);
        });

        socket.on('you-were-kicked', () => {
            localStream?.getTracks().forEach(t => t.stop());
            micStream?.getTracks().forEach(t => t.stop());
            setIsKicked(true);
        });

        socket.on('duplicate-login-kicked', () => {
            localStream?.getTracks().forEach(t => t.stop());
            micStream?.getTracks().forEach(t => t.stop());
            setIsDuplicateKicked(true);
        });

        return () => {
            socket.off('room-ended');
            socket.off('you-were-kicked');
            socket.off('duplicate-login-kicked');
        };
    }, [socket, localStream, micStream, router]);

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a1a] text-white">
                <p className="text-lg text-red-400">{error}</p>
                <button
                    onClick={() => router.push("/")}
                    className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold cursor-pointer hover:bg-violet-500"
                >
                    Back to home
                </button>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a] text-white">
                <p>Loading room...</p>
            </div>
        );
    }

    const currentUserId = user?.id;
    const remoteParticipants = participants.filter(p => p.userId !== currentUserId);

    const allTiles = [
        <VideoTile
            key="local-user"
            name={"You"}
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
                    isSpeaking={speakingUsers.has(p.userId)}
                    subtitle={subtitleMap.get(p.userId)}
                    userId={p.userId}
                    onOpenProfile={setSelectedProfileId}
                />
            );
        }),
    ];



    const selectedParticipant = selectedProfileId
        ? participants.find(p => p.userId === selectedProfileId)
        : null;

    return (
        <div className="flex h-screen flex-col bg-[#0a0a1a] text-white overflow-hidden">
            {isRoomEnded && !isKicked && !isDuplicateKicked && (
                <RoomEndedModal onGoHome={() => router.push('/')} />
            )}
            {isKicked && (
                <KickedModal onGoHome={() => router.push('/')} />
            )}
            {isDuplicateKicked && (
                <DuplicateSessionModal onGoHome={() => router.push('/')} />
            )}
            {kickTarget && (
                <ConfirmKickModal
                    targetName={kickTarget.name}
                    status={kickStatus}
                    errorMessage={kickError}
                    onConfirm={confirmKickParticipant}
                    onCancel={handleCloseKickModal}
                />
            )}
            {selectedProfileId && selectedParticipant && (
                <UserProfileModal
                    targetUserId={selectedProfileId}
                    targetName={`${selectedParticipant.firstName ?? ''} ${selectedParticipant.lastName ?? ''}`.trim()}
                    targetAvatar={selectedParticipant.avatar}
                    targetBio={selectedParticipant.bio}
                    currentUserId={user?.id}
                    initialData={profileCacheRef.current[selectedProfileId]}
                    onDataLoaded={(uid, data) => {
                        const prev = profileCacheRef.current[uid];
                        profileCacheRef.current[uid] = data;
                        if (prev?.isFollowing !== data.isFollowing) {
                            setFollowingIds(current => {
                                const next = new Set(current);
                                if (data.isFollowing) next.add(uid);
                                else next.delete(uid);
                                return next;
                            });
                        }
                    }}
                    onClose={() => setSelectedProfileId(null)}
                />
            )}
            <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={handleLeaveRoom}
                >
                    <Image src={logo} alt="WeTalk Logo" height={48} className="h-12 w-auto object-contain" />
                </div>
            </header>

            <Toaster position="bottom-left" reverseOrder={false} />

            <ReactionLayer socket={socket} currentUserId={user?.id} />

            <div className="flex flex-1 min-h-0 items-center justify-center p-6 w-full relative overflow-hidden flex-row">
                <div className="flex-1 w-full h-full relative group flex items-center justify-center transition-all duration-300">
                    <div
                        className={`w-[85%] max-w-[1600px] mx-auto h-full min-h-[75vh] gap-4 ${allTiles.length === 1 ? 'flex items-center justify-center' : 'grid px-10'}`}
                        style={allTiles.length === 1 ? {} : {
                            gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(allTiles.length || 1))}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${Math.ceil(allTiles.length / Math.ceil(Math.sqrt(allTiles.length || 1)))}, minmax(0, 1fr))`,
                        }}
                    >
                        {allTiles.length > 0 ? (
                            allTiles.length === 1 ? (
                                <div className="aspect-video w-full max-w-5xl max-h-full relative">
                                    {allTiles[0]}
                                </div>
                            ) : allTiles
                        ) : (
                            <div className="flex w-full max-w-3xl aspect-video items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                                <p className="text-zinc-500">No one is in the room</p>
                            </div>
                        )}
                    </div>
                </div>


                {user && (
                    <div
                        className={`shrink-0 self-stretch flex overflow-hidden transition-all duration-500 ease-in-out ${(isChatOpen || isParticipantOpen)
                            ? "ml-6 w-[350px] opacity-100 translate-x-0"
                            : "ml-0 w-0 opacity-0 translate-x-10 pointer-events-none"
                            }`}
                    >
                        <div className="w-[350px] min-w-[350px] h-full shrink-0 py-4">
                            <ChatBox
                                socket={socket}
                                roomId={roomId}
                                currentUser={user}
                                isOpen={isChatOpen}
                                onClose={() => setIsChatOpen(false)}
                            />
                            {isParticipantOpen && (
                                <ParticipantList
                                    participants={participants}
                                    currentUserId={user.id}
                                    hostId={room?.hostId}
                                    onClose={() => setIsParticipantOpen(false)}
                                    onKick={initKickParticipant}
                                    onViewProfile={setSelectedProfileId}
                                    followingIds={followingIds}
                                />
                            )}
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
                        {localAudioEnabled ? "Mute mic" : "Unmute mic"}
                    </span>
                </button>

                <button
                    onClick={handleToggleVideo}
                    className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-all ${localVideoEnabled ? "bg-violet-600 hover:bg-violet-500" : "bg-red-500 hover:bg-red-600"}`}
                >
                    {localVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5 text-white" />}
                    <span className="absolute bottom-[120%] left-1/2 -translate-x-1/2 rounded-md bg-[#2B2D36]/90 px-3 py-1.5 text-[13px] font-medium text-white opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100 whitespace-nowrap pointer-events-none border border-white/10 shadow-lg backdrop-blur-md z-50">
                        {localVideoEnabled ? "Turn off camera" : "Turn on camera"}
                    </span>
                </button>

                <button
                    onClick={handleToggleChat}
                    className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-all ${isChatOpen ? "bg-violet-600 hover:bg-violet-500" : "bg-white/10 hover:bg-white/20"}`}
                >
                    <MessageSquare className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg animate-in zoom-in-50 duration-200">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                    <span className="absolute bottom-[120%] left-1/2 -translate-x-1/2 rounded-md bg-[#2B2D36]/90 px-3 py-1.5 text-[13px] font-medium text-white opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100 whitespace-nowrap pointer-events-none border border-white/10 shadow-lg backdrop-blur-md z-50">
                        {isChatOpen ? "Close chat" : "Open chat"}
                    </span>
                </button>

                <button
                    onClick={handleToggleParticipant}
                    className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-all ${isParticipantOpen ? "bg-violet-600 hover:bg-violet-500" : "bg-white/10 hover:bg-white/20"}`}
                >
                    <Users className="h-5 w-5 " />
                    <span className="absolute bottom-[120%] left-1/2 -translate-x-1/2 rounded-md bg-[#2B2D36]/90 px-3 py-1.5 text-[13px] font-medium text-white opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100 whitespace-nowrap pointer-events-none border border-white/10 shadow-lg backdrop-blur-md z-50">
                        {isParticipantOpen ? "Close participants" : "Open participants"}
                    </span>
                </button>

                <div className="relative group/emoji">
                    <button
                        onClick={() => setIsReactionMenuOpen(!isReactionMenuOpen)}
                        className={`relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-all ${isReactionMenuOpen ? "bg-violet-600" : "bg-white/10 hover:bg-white/20"}`}
                    >
                        <Smile className="h-5 w-5 text-white" />

                        {/* Emoji tooltip */}
                        <span className="absolute bottom-[120%] left-1/2 -translate-x-1/2 rounded-md bg-[#2B2D36]/90 px-3 py-1.5 text-[13px] font-medium text-white opacity-0 scale-95 transition-all group-hover/emoji:opacity-100 group-hover/emoji:scale-100 whitespace-nowrap pointer-events-none shadow-lg z-50">
                            Reactions
                        </span>
                    </button>
                    {/* Emoji selection board */}
                    <div className={`absolute bottom-[130%] left-1/2 -translate-x-1/2 flex gap-2 rounded-2xl bg-[#2B2D36] border border-white/10 p-2 shadow-xl backdrop-blur-md z-50 transition-all duration-200 ${isReactionMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}`}>
                        {EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => handleSendReaction(emoji)}
                                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl hover:bg-white/10 hover:scale-125 transition-transform cursor-pointer"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => setIsSubtitleEnabled(prev => !prev)}
                    className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-all ${isSubtitleEnabled ? "bg-violet-600 hover:bg-violet-500" : "bg-white/10 hover:bg-white/20"}`}
                >
                    <Captions className="h-5 w-5" />
                    <span className="absolute bottom-[120%] left-1/2 -translate-x-1/2 rounded-md bg-[#2B2D36]/90 px-3 py-1.5 text-[13px] font-medium text-white opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100 whitespace-nowrap pointer-events-none border border-white/10 shadow-lg backdrop-blur-md z-50">
                        {isSubtitleEnabled ? "Turn off subtitles" : "Turn on subtitles"}
                    </span>
                </button>


                <button
                    onClick={handleLeaveRoom}
                    disabled={isLeaving}
                    className="group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-red-600 transition-all hover:bg-red-500 disabled:opacity-50"
                >
                    <PhoneOff className={`h-5 w-5 ${isLeaving ? 'animate-pulse opacity-50' : ''}`} />
                    <span className="absolute bottom-[120%] left-1/2 -translate-x-1/2 rounded-md bg-red-600/90 px-3 py-1.5 text-[13px] font-medium text-white opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100 whitespace-nowrap pointer-events-none border border-red-500/30 shadow-[0_0_15px_rgba(220,38,38,0.3)] backdrop-blur-md z-50">
                        Leave room
                    </span>
                </button>
            </div>

        </div>
    );
}

