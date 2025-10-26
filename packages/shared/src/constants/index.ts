export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  TYPING: 'typing',
  READ_RECEIPT: 'read_receipt',
} as const;

export const API_ROUTES = {
  AUTH: '/api/v1/auth',
  USERS: '/api/v1/users',
  MESSAGES: '/api/v1/messages',
  ROOMS: '/api/v1/rooms',
} as const;
