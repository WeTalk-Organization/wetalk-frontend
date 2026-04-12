import { User } from "./auth";

export interface CustomTrack extends MediaStreamTrack {
    producerId?: string;
}
export type ChatMessage = {
    id: string;
    sender: User;
    message: string;
    timestamp: string;
};
export interface SocketUser {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
}