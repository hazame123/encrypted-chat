import type { Server } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SendMessageData,
} from '@encrypted-chat/shared';
import { MessageService } from '../services/message.service.js';

// Extended socket interface
interface AuthenticatedSocket {
  userId: string;
  username: string;
  handshake: {
    auth: {
      token: string;
    };
  };
  id: string;
  broadcast: {
    emit: (event: string, ...args: unknown[]) => void;
  };
  emit: (event: string, ...args: unknown[]) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
}

const messageService = new MessageService();

// Store online users: userId -> socketId[]
const onlineUsers = new Map<string, Set<string>>();

export function setupSocketHandlers(
  fastify: FastifyInstance,
  io: Server<ClientToServerEvents, ServerToClientEvents>
) {
  io.use((socket: Partial<AuthenticatedSocket>, next) => {
    // Authentication middleware
    const token = socket.handshake?.auth?.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      // Verify JWT token using Fastify JWT plugin
      const decoded = fastify.jwt.verify(token) as {
        userId: string;
        username: string;
      };

      if (socket) {
        socket.userId = decoded.userId;
        socket.username = decoded.username;
      }
      next();
    } catch (err) {
      console.error('WebSocket authentication failed:', err);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    const username = socket.username;

    console.log(`User connected: ${username} (${userId})`);

    // Add user to online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Notify others that user is online
    socket.broadcast.emit('userOnline', { userId, username });

    // Send list of online users to the connecting user
    const onlineUserIds = Array.from(onlineUsers.keys()).filter(
      (id) => id !== userId
    );
    socket.emit('onlineUsers', onlineUserIds);

    // Handle sending messages
    socket.on('sendMessage', async (data: SendMessageData) => {
      try {
        // Save message to database
        const message = await messageService.createMessage(userId, data);

        // Send to recipient if online
        const recipientSockets = onlineUsers.get(data.recipientId);
        if (recipientSockets) {
          recipientSockets.forEach((socketId) => {
            io.to(socketId).emit('message', message);
          });
        }

        // Send confirmation to sender
        socket.emit('message', message);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const recipientSockets = onlineUsers.get(data.recipientId);
      if (recipientSockets) {
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit('typing', {
            userId,
            username,
            isTyping: data.isTyping,
          });
        });
      }
    });

    // Handle mark as read
    socket.on('markAsRead', async (data) => {
      try {
        await messageService.markAsRead(data.messageId, userId);

        // Notify sender that message was read
        const message = await messageService.getConversation(userId, userId, 1);
        if (message.length > 0) {
          const senderId = message[0].senderId;
          const senderSockets = onlineUsers.get(senderId);
          if (senderSockets) {
            senderSockets.forEach((socketId) => {
              io.to(socketId).emit('messageRead', {
                messageId: data.messageId,
                userId,
              });
            });
          }
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${username} (${userId})`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);

        // If user has no more active connections, mark as offline
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          socket.broadcast.emit('userOffline', { userId });
        }
      }
    });
  });

  return io;
}

// Augment Socket type
declare module 'socket.io' {
  interface Socket {
    userId: string;
    username: string;
  }
}
