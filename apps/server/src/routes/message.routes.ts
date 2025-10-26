import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MessageService } from '../services/message.service.js';

const messageService = new MessageService();

// Type for authenticated request
interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string;
    email: string;
    username: string;
  };
}

export default async function messageRoutes(fastify: FastifyInstance) {
  // Get conversation with a specific user
  fastify.get<{
    Params: { userId: string };
    Querystring: { limit?: string };
  }>(
    '/conversation/:userId',
    {
      onRequest: [fastify.authenticate],
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const currentUserId = request.user.userId;
        const { userId } = request.params;
        const limit = request.query.limit ? parseInt(request.query.limit) : 50;

        const messages = await messageService.getConversation(
          currentUserId,
          userId,
          limit
        );

        return reply.send({ messages });
      } catch (error: unknown) {
        fastify.log.error(error);
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          error: 'Failed to fetch conversation',
          message,
        });
      }
    }
  );

  // Get all conversations
  fastify.get(
    '/conversations',
    {
      onRequest: [fastify.authenticate],
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.userId;
        const conversations = await messageService.getConversations(userId);

        return reply.send({ conversations });
      } catch (error: unknown) {
        fastify.log.error(error);
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          error: 'Failed to fetch conversations',
          message,
        });
      }
    }
  );

  // Get unread count
  fastify.get<{
    Params: { userId: string };
  }>(
    '/unread/:userId',
    {
      onRequest: [fastify.authenticate],
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const currentUserId = request.user.userId;
        const { userId } = request.params;

        const unreadCount = await messageService.getUnreadCount(
          currentUserId,
          userId
        );

        return reply.send({ unreadCount });
      } catch (error: unknown) {
        fastify.log.error(error);
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          error: 'Failed to fetch unread count',
          message,
        });
      }
    }
  );
}
