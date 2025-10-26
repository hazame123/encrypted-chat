import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import {
  registerJsonSchema,
  loginJsonSchema,
  refreshTokenJsonSchema,
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
} from '../schemas/auth.schema.js';

const authService = new AuthService();

// Type for JWT user payload
interface JwtUser {
  userId: string;
  email: string;
  username: string;
}

export default async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post<{ Body: RegisterInput }>(
    '/register',
    {
      schema: {
        body: registerJsonSchema,
        response: {
          201: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  publicKey: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: RegisterInput }>,
      reply: FastifyReply
    ) => {
      try {
        const user = await authService.register(request.body);

        // Generate tokens
        const accessToken = fastify.jwt.sign({
          userId: user.id,
          email: user.email,
          username: user.username,
        });

        const refreshToken = fastify.refreshSign({
          userId: user.id,
        });

        // Store refresh token
        await authService.updateRefreshToken(user.id, refreshToken);

        return reply.code(201).send({
          user,
          accessToken,
          refreshToken,
        });
      } catch (error: unknown) {
        fastify.log.error(error);
        return reply.code(400).send({
          error: 'Registration failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Login
  fastify.post<{ Body: LoginInput }>(
    '/login',
    {
      schema: {
        body: loginJsonSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  publicKey: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: LoginInput }>,
      reply: FastifyReply
    ) => {
      try {
        const { user, userId } = await authService.login(request.body);

        // Generate tokens
        const accessToken = fastify.jwt.sign({
          userId: user.id,
          email: user.email,
          username: user.username,
        });

        const refreshToken = fastify.refreshSign({
          userId: user.id,
        });

        // Store refresh token
        await authService.updateRefreshToken(userId, refreshToken);

        return reply.send({
          user,
          accessToken,
          refreshToken,
        });
      } catch (error: unknown) {
        fastify.log.error(error);
        return reply.code(401).send({
          error: 'Login failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Refresh Token
  fastify.post<{ Body: RefreshTokenInput }>(
    '/refresh',
    {
      schema: {
        body: refreshTokenJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Body: RefreshTokenInput }>,
      reply: FastifyReply
    ) => {
      try {
        // Verify refresh token
        const decoded = await fastify.refreshVerify(request.body.refreshToken);

        // Validate refresh token in database
        const isValid = await authService.validateRefreshToken(
          decoded.userId,
          request.body.refreshToken
        );

        if (!isValid) {
          return reply.code(401).send({
            error: 'Invalid refresh token',
            message: 'Please login again',
          });
        }

        // Get user data
        const user = await authService.getUserById(decoded.userId);

        if (!user) {
          return reply.code(401).send({
            error: 'User not found',
            message: 'Please login again',
          });
        }

        // Generate new tokens
        const accessToken = fastify.jwt.sign({
          userId: user.id,
          email: user.email,
          username: user.username,
        });

        const refreshToken = fastify.refreshSign({
          userId: user.id,
        });

        // Update refresh token in database
        await authService.updateRefreshToken(user.id, refreshToken);

        return reply.send({
          user,
          accessToken,
          refreshToken,
        });
      } catch (error: unknown) {
        fastify.log.error(error);
        return reply.code(401).send({
          error: 'Token refresh failed',
          message: 'Please login again',
        });
      }
    }
  );

  // Logout
  fastify.post(
    '/logout',
    {
      onRequest: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request.user as JwtUser).userId;

        // Clear refresh token
        await authService.updateRefreshToken(userId, null);

        return reply.send({
          message: 'Logged out successfully',
        });
      } catch (error: unknown) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Logout failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Get current user (protected route example)
  fastify.get(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request.user as JwtUser).userId;
        const user = await authService.getUserById(userId);

        if (!user) {
          return reply.code(404).send({
            error: 'User not found',
          });
        }

        return reply.send({ user });
      } catch (error: unknown) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Failed to get user',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}
