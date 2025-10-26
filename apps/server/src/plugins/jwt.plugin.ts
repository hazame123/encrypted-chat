import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import jwtLib, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default fp(async (fastify: FastifyInstance) => {
  // Register access token JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    sign: {
      expiresIn: '15m', // Access token expires in 15 minutes
    },
  });

  // Create custom methods for refresh tokens using jsonwebtoken directly
  const refreshSecret =
    process.env.JWT_REFRESH_SECRET ||
    'your-refresh-secret-change-in-production';

  fastify.decorate(
    'refreshSign',
    (payload: string | object | Buffer, options?: SignOptions) => {
      return jwtLib.sign(payload, refreshSecret, {
        ...options,
        expiresIn: '7d',
      });
    }
  );

  fastify.decorate('refreshVerify', async (token: string) => {
    return new Promise<string | JwtPayload>((resolve, reject) => {
      jwtLib.verify(
        token,
        refreshSecret,
        (err: Error | null, decoded: string | JwtPayload | undefined) => {
          if (err) reject(err);
          else resolve(decoded as string | JwtPayload);
        }
      );
    });
  });

  // Authentication decorator
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply
          .code(401)
          .send({ error: 'Unauthorized', message: 'Invalid or expired token' });
      }
    }
  );
});

// Type augmentation
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    refreshSign: (
      payload: string | object | Buffer,
      options?: SignOptions
    ) => string;
    refreshVerify: (token: string) => Promise<string | JwtPayload>;
  }
}
