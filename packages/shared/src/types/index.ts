export interface User {
  id: string;
  username: string;
  email: string;
  publicKey: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  encryptedContent: string;
  timestamp: Date;
  isRead: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  members: string[];
  createdAt: Date;
}

// Auth Types
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  publicKey: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
}

// WebSocket Events
export interface ServerToClientEvents {
  message: (data: MessageData) => void;
  userOnline: (data: { userId: string; username: string }) => void;
  userOffline: (data: { userId: string }) => void;
  typing: (data: {
    userId: string;
    username: string;
    isTyping: boolean;
  }) => void;
  messageRead: (data: { messageId: string; userId: string }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  sendMessage: (data: SendMessageData) => void;
  typing: (data: { recipientId: string; isTyping: boolean }) => void;
  markAsRead: (data: { messageId: string }) => void;
  joinRoom: (data: { roomId: string }) => void;
  leaveRoom: (data: { roomId: string }) => void;
}

export interface MessageData {
  id: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  encryptedContent: string;
  timestamp: string;
  isRead: boolean;
}

export interface SendMessageData {
  recipientId: string;
  encryptedContent: string;
}

export interface ConversationPreview {
  userId: string;
  username: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline: boolean;
}
