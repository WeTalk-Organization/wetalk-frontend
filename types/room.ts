export interface Participant {
    userId: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    videoEnabled: boolean;
    audioEnabled: boolean;
    joinedAt?: string;
}

export interface RoomResponse {
    id: string;
    roomId: string;
    hostId: string;
    isActive: boolean;
    createdAt: string;
    topics?: string[];
    language?: string;
    level?: string;
    maxParticipants?: number;
    participants?: Participant[];
}

/** Payload gửi lên khi tạo phòng */
export interface CreateRoomPayload {
    topics: string[];
    /** BCP-47 code: 'en' | 'vi' | 'ja' | 'ko' | 'zh' | 'fr' | 'es' | 'de' */
    language: string;
    level: string;
    maxParticipants: number;
}

/** Map language code → tên hiển thị + emoji cờ */
export const LANGUAGE_MAP: Record<string, { label: string; flag: string }> = {
    en: { label: 'English', flag: '🇬🇧' },
    vi: { label: 'Vietnamese', flag: '🇻🇳' },
    ja: { label: 'Japanese', flag: '🇯🇵' },
    ko: { label: 'Korean', flag: '🇰🇷' },
    zh: { label: 'Chinese', flag: '🇨🇳' },
    fr: { label: 'French', flag: '🇫🇷' },
    es: { label: 'Spanish', flag: '🇪🇸' },
    de: { label: 'German', flag: '🇩🇪' },
};

export const LEVEL_MAP: Record<string, { label: string }> = {
    Any: { label: 'Any Level' },
    Beginner: { label: 'Beginner' },
    Intermediate: { label: 'Intermediate' },
    Advanced: { label: 'Advanced' },
};

export const TOPICS = [
  { label: "Daily Life", emoji: "☀️" },
  { label: "Travel", emoji: "✈️" },
  { label: "Food & Cooking", emoji: "🍜" },
  { label: "Sports", emoji: "⚽" },
  { label: "Music", emoji: "🎵" },
  { label: "Movies & TV", emoji: "🎬" },
  { label: "Technology", emoji: "💻" },
  { label: "Science", emoji: "🔬" },
  { label: "Business", emoji: "💼" },
  { label: "Education", emoji: "📚" },
  { label: "Health & Wellness", emoji: "🧘" },
  { label: "Art & Culture", emoji: "🎨" },
  { label: "Gaming", emoji: "🎮" },
  { label: "Fashion", emoji: "👗" },
  { label: "Books", emoji: "📖" },
  { label: "Politics & Society", emoji: "🌍" },
];

export const TOPIC_MAP = TOPICS.reduce((acc, topic) => {
    acc[topic.label] = topic;
    return acc;
}, {} as Record<string, { label: string; emoji: string }>);


export interface VideoTileProps {
    name: string;
    avatar?: string;
    videoEnabled?: boolean;
    stream?: MediaStream | null;
    isLocal?: boolean;
    isSpeaking?: boolean;
    subtitle?: string;
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

export interface RoomListItem {
    roomId: string;
    hostId: string;
    createdAt: string;
    topics?: string[];
    language?: string;
    level?: string;
    maxParticipants?: number;
    participantCount: number;
    participants: {
        userId: string;
        firstName: string;
        lastName: string;
        avatar: string;
    }[];
}


export interface PaginatedRoomList {
    data: RoomListItem[];
    total: number;
    page: number;
    totalPages: number;
}
