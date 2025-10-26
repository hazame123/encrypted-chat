import { PrismaClient } from '@prisma/client';
import type { MessageData, SendMessageData } from '@encrypted-chat/shared';

const prisma = new PrismaClient();

export class MessageService {
  async createMessage(
    senderId: string,
    data: SendMessageData
  ): Promise<MessageData> {
    const message = await prisma.message.create({
      data: {
        senderId,
        recipientId: data.recipientId,
        encryptedContent: data.encryptedContent,
      },
      include: {
        sender: {
          select: {
            username: true,
          },
        },
      },
    });

    return {
      id: message.id,
      senderId: message.senderId,
      senderUsername: message.sender.username,
      recipientId: message.recipientId!,
      encryptedContent: message.encryptedContent,
      timestamp: message.createdAt.toISOString(),
      isRead: message.isRead,
    };
  }

  async getConversation(userId: string, otherUserId: string, limit = 50) {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return messages.reverse().map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      senderUsername: msg.sender.username,
      recipientId: msg.recipientId!,
      encryptedContent: msg.encryptedContent,
      timestamp: msg.createdAt.toISOString(),
      isRead: msg.isRead,
    }));
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    await prisma.message.updateMany({
      where: {
        id: messageId,
        recipientId: userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  async getUnreadCount(userId: string, senderId: string): Promise<number> {
    return prisma.message.count({
      where: {
        recipientId: userId,
        senderId,
        isRead: false,
      },
    });
  }

  async getConversations(userId: string) {
    // Get all users the current user has exchanged messages with
    const conversations = await prisma.$queryRaw<
      Array<{
        userId: string;
        username: string;
        lastMessage: string;
        lastMessageTime: Date;
        unreadCount: bigint;
      }>
    >`
      SELECT DISTINCT
        CASE
          WHEN m."senderId" = ${userId} THEN m."recipientId"
          ELSE m."senderId"
        END as "userId",
        u.username,
        (
          SELECT m2."encryptedContent"
          FROM messages m2
          WHERE (m2."senderId" = ${userId} AND m2."recipientId" = u.id)
             OR (m2."senderId" = u.id AND m2."recipientId" = ${userId})
          ORDER BY m2."createdAt" DESC
          LIMIT 1
        ) as "lastMessage",
        (
          SELECT m2."createdAt"
          FROM messages m2
          WHERE (m2."senderId" = ${userId} AND m2."recipientId" = u.id)
             OR (m2."senderId" = u.id AND m2."recipientId" = ${userId})
          ORDER BY m2."createdAt" DESC
          LIMIT 1
        ) as "lastMessageTime",
        (
          SELECT COUNT(*)
          FROM messages m3
          WHERE m3."senderId" = u.id
            AND m3."recipientId" = ${userId}
            AND m3."isRead" = false
        ) as "unreadCount"
      FROM messages m
      JOIN users u ON u.id = CASE
        WHEN m."senderId" = ${userId} THEN m."recipientId"
        ELSE m."senderId"
      END
      WHERE m."senderId" = ${userId} OR m."recipientId" = ${userId}
      ORDER BY "lastMessageTime" DESC
    `;

    return conversations.map((conv) => ({
      userId: conv.userId,
      username: conv.username,
      lastMessage: conv.lastMessage,
      lastMessageTime: conv.lastMessageTime?.toISOString(),
      unreadCount: Number(conv.unreadCount),
      isOnline: false, // Will be updated by WebSocket
    }));
  }
}
