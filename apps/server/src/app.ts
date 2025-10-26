import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifySocketIO from 'fastify-socket.io';
import type { Server } from 'socket.io';
import jwtPlugin from './plugins/jwt.plugin.js';
import authRoutes from './routes/auth.routes.js';
import messageRoutes from './routes/message.routes.js';
import usersRoutes from './routes/users.routes.js';
import { setupSocketHandlers } from './websocket/socket.handler.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
});

await fastify.register(jwtPlugin);

// Register Socket.IO
await fastify.register(fastifySocketIO, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

// Health check route
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
await fastify.register(messageRoutes, { prefix: '/api/v1/messages' });
await fastify.register(usersRoutes, { prefix: '/api/v1/users' });

// Setup WebSocket handlers after server is ready
fastify.ready((err) => {
  if (err) throw err;

  setupSocketHandlers(fastify.io as Server);
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server listening on port ${port}`);
    console.log(`🔌 WebSocket server ready`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
