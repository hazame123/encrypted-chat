import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type for authenticated request
interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string;
    email: string;
    username: string;
  };
}

export default async function usersRoutes(fastify: FastifyInstance) {
  // Search users
  fastify.get<{
    Querystring: { q: string };
  }>(
    '/search',
    {
      onRequest: [fastify.authenticate],
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const currentUserId = request.user.userId;
        const { q } = request.query as { q: string };

        if (!q || q.length < 2) {
          return reply.send({ users: [] });
        }

        const users = await prisma.user.findMany({
          where: {
            AND: [
              { id: { not: currentUserId } },
              {
                OR: [
                  { username: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } },
                ],
              },
            ],
          },
          select: {
            id: true,
            username: true,
            email: true,
            publicKey: true,
            createdAt: true,
          },
          take: 10,
        });

        return reply.send({ users });
      } catch (error: unknown) {
        fastify.log.error(error);
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          error: 'Search failed',
          message,
        });
      }
    }
  );

  // Get user public key
  fastify.get<{
    Params: { userId: string };
  }>(
    '/:userId/public-key',
    {
      onRequest: [fastify.authenticate],
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { publicKey: true },
        });

        if (!user) {
          return reply.code(404).send({ error: 'User not found' });
        }

        return reply.send({ publicKey: user.publicKey });
      } catch (error: unknown) {
        fastify.log.error(error);
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({
          error: 'Failed to get public key',
          message,
        });
      }
    }
  );
}
