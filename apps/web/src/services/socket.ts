import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  MessageData,
  SendMessageData,
} from '@encrypted-chat/shared';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null =
    null;
  private messageHandlers: Set<(message: MessageData) => void> = new Set();
  private typingHandlers: Set<
    (data: { userId: string; username: string; isTyping: boolean }) => void
  > = new Set();
  private userOnlineHandlers: Set<
    (data: { userId: string; username: string }) => void
  > = new Set();
  private userOfflineHandlers: Set<(data: { userId: string }) => void> =
    new Set();

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    this.socket.on('message', (data) => {
      this.messageHandlers.forEach((handler) => handler(data));
    });

    this.socket.on('typing', (data) => {
      this.typingHandlers.forEach((handler) => handler(data));
    });

    this.socket.on('userOnline', (data) => {
      this.userOnlineHandlers.forEach((handler) => handler(data));
    });

    this.socket.on('userOffline', (data) => {
      this.userOfflineHandlers.forEach((handler) => handler(data));
    });

    this.socket.on('error', (data) => {
      console.error('Socket error:', data.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.messageHandlers.clear();
    this.typingHandlers.clear();
    this.userOnlineHandlers.clear();
    this.userOfflineHandlers.clear();
  }

  sendMessage(data: SendMessageData) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('sendMessage', data);
  }

  sendTyping(recipientId: string, isTyping: boolean) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing', { recipientId, isTyping });
  }

  markAsRead(messageId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('markAsRead', { messageId });
  }

  onMessage(handler: (message: MessageData) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onTyping(
    handler: (data: {
      userId: string;
      username: string;
      isTyping: boolean;
    }) => void
  ) {
    this.typingHandlers.add(handler);
    return () => this.typingHandlers.delete(handler);
  }

  onUserOnline(handler: (data: { userId: string; username: string }) => void) {
    this.userOnlineHandlers.add(handler);
    return () => this.userOnlineHandlers.delete(handler);
  }

  onUserOffline(handler: (data: { userId: string }) => void) {
    this.userOfflineHandlers.add(handler);
    return () => this.userOfflineHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
