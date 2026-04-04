export interface Participant {
    userId: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    videoEnabled: boolean;
    audioEnabled: boolean;
    joinedAt?: string;
}

export interface MeetingResponse {
    id: string;
    roomId: string;
    hostId: string;
    isActive: boolean;
    createdAt: string;
    participants?: Participant[];
}


export interface VideoTileProps {
    name: string;
    avatarUrl?: string;
    videoEnabled?: boolean;
    stream?: MediaStream | null;
}

export interface SocketUserPayload {
    id: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
}
export interface UserEventPayload {
    socketId: string;
    user: SocketUserPayload;
}