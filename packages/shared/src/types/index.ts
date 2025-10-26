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
