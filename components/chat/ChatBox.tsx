import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/webRTC';
import { User } from '@/types/auth';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { Socket } from 'socket.io-client';
import { X } from 'lucide-react';

interface ChatBoxProps {
    socket: Socket | null;
    roomId: string;
    currentUser: User | undefined;
    isOpen: boolean;
    onClose: () => void;
}


const ChatBox: React.FC<ChatBoxProps> = ({ socket, roomId, currentUser, isOpen, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    const sendChatMessage = async (messageText: string) => {
        if (!socket || !roomId) return;
        try {
            const response = await new Promise<{ success: boolean; chatMessage: ChatMessage }>((resolve) => {
                socket.emit('send-chat-message', { roomId, message: messageText }, resolve);
            });
            if (response.success) {
                setMessages(prev => [...prev, response.chatMessage]);
            }
        } catch (error) {
            console.error('Lỗi khi chat:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!socket) return;
        const handleReceiveMessage = (newMessage: ChatMessage) => {
            setMessages(prev => [...prev, newMessage]);
        };
        socket.on('receive-chat-message', handleReceiveMessage);
        return () => {
            socket.off('receive-chat-message', handleReceiveMessage);
        };
    }, [socket]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        }
    }, []);

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setInputValue((prev) => prev + emojiData.emoji);
    };

    const handleSend = () => {
        if (inputValue.trim()) {
            sendChatMessage(inputValue);
            setInputValue(''); // Clear input after sending
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={`flex flex-col h-full w-[350px] bg-[#1A1D24] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.4)] overflow-hidden font-sans border border-white/10 ${isOpen ? '' : 'hidden'}`}>
            {/* Header */}
            <div className="px-5 py-4 bg-[#2B2D36]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    <h3 className="font-semibold text-white text-base m-0 tracking-wide">Chat</h3>
                </div>
                <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Message List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                {messages.length === 0 && (
                    <div className="text-center text-[#6B6D76] mt-5 text-[13px]">
                        Chưa có tin nhắn nào. Bắt đầu trò chuyện!
                    </div>
                )}
                {messages.map((msg) => {
                    // Check if current user is the sender
                    const isMine = currentUser?.id === msg.sender.id;
                    const displayName = isMine ? 'Bạn' : `${msg.sender.firstName} ${msg.sender.lastName}`;
                    const time = new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                    });

                    const firstLetter = msg.sender.firstName?.charAt(0)?.toUpperCase() || '?';

                    return (
                        <div
                            key={msg.id}
                            className={`flex gap-3 w-full animate-in slide-in-from-bottom-2 duration-300 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            {/* Avatar */}
                            {!isMine && (
                                msg.sender.avatar ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={msg.sender.avatar}
                                            alt="avatar"
                                            className="w-9 h-9 rounded-full object-cover flex-shrink-0 shadow-sm border border-white/10"
                                            referrerPolicy="no-referrer"
                                        />
                                    </>
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00C6FF] to-[#0072FF] flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0 shadow-sm border border-white/10">
                                        {firstLetter}
                                    </div>
                                )
                            )}

                            {/* Message Bubble + Meta Info */}
                            <div className="flex flex-col max-w-[80%]">
                                <span className={`text-[12px] text-[#9496A1] mb-1.5 mx-0.5 ${isMine ? 'text-right' : 'text-left'}`}>
                                    {displayName}
                                </span>
                                <div className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed break-words relative shadow-sm ${isMine
                                    ? 'bg-gradient-to-br from-[#00C6FF] to-[#0072FF] text-white rounded-br-sm'
                                    : 'bg-[#2b2d36] text-[#E2E4EB] rounded-bl-sm border border-white/5'
                                    }`}>
                                    {msg.message}
                                </div>
                                <span className={`text-[11px] text-[#6B6D76] mt-1 mx-0.5 ${isMine ? 'text-right' : 'text-left'}`}>
                                    {time}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex p-4 bg-[#22242b] border-t border-white/5 gap-3 items-center relative">
                {
                    showEmojiPicker && (
                        <div ref={emojiPickerRef}
                            className="absolute bottom-[calc(100%+8px)] left-4 z-50 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <EmojiPicker onEmojiClick={onEmojiClick}
                                theme={Theme.DARK}
                                searchPlaceHolder="Tìm kiếm emoji..."
                                width={320}
                                height={400} />
                        </div>
                    )
                }
                <button
                    className={`p-2 rounded-full flex-shrink-0 transition-colors duration-200 flex items-center justify-center ${showEmojiPicker ? 'bg-[#00C6FF]/10 text-[#00C6FF]' : 'text-[#6B6D76] hover:text-[#E2E4EB] hover:bg-white/5'}`}
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    aria-label="Thêm emoji"
                    title="Thêm emoji"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
                <input
                    type="text"
                    className="flex-1 min-w-0 bg-[#181a20] border border-white/10 rounded-full px-4 py-3 text-white text-[14px] outline-none transition-all duration-200 focus:border-[#00C6FF] focus:shadow-[0_0_0_2px_rgba(0,198,255,0.2)] placeholder-[#6B6D76]"
                    placeholder="Gửi tin nhắn..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    className="bg-gradient-to-br from-[#00C6FF] to-[#0072FF] text-white border-none rounded-full w-11 h-11 flex items-center justify-center cursor-pointer transition-all duration-200 shadow-[0_4px_12px_rgba(0,114,255,0.15)] hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(0,114,255,0.3)] active:translate-y-0 disabled:opacity-60 disabled:bg-[#3a3f4b] disabled:from-[#3a3f4b] disabled:to-[#3a3f4b] disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0"
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    aria-label="Send message"
                >
                    <svg className="w-4 h-4 fill-current -mr-0.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};
export default React.memo(ChatBox);