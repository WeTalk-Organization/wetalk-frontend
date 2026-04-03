export const mockParticipants = Array.from({ length: 20 }).map((_, idx) => ({
    userId: `mock-${idx}`,
    firstName: `Người Dùng`,
    lastName: `Mock ${idx + 1}`,
    avatarUrl: undefined,
    videoEnabled: false,
    stream: null as MediaStream | null,
}));
