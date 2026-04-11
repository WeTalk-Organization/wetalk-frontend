export interface Participant {
    userId: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
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
    avatar?: string;
    videoEnabled?: boolean;
    stream?: MediaStream | null;
    isLocal?: boolean;
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