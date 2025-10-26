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
