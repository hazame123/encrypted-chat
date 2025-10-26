import { create } from 'zustand';
import type { MessageData, ConversationPreview } from '@encrypted-chat/shared';

interface ChatState {
  conversations: ConversationPreview[];
  messages: Record<string, MessageData[]>; // userId -> messages
  currentChatUserId: string | null;
  onlineUsers: Set<string>;
  typingUsers: Record<string, boolean>; // userId -> isTyping

  setConversations: (conversations: ConversationPreview[]) => void;
  addConversation: (conversation: ConversationPreview) => void;
  setMessages: (userId: string, messages: MessageData[]) => void;
  addMessage: (message: MessageData) => void;
  setCurrentChatUserId: (userId: string | null) => void;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  setUserTyping: (userId: string, isTyping: boolean) => void;
  markMessagesAsRead: (userId: string) => void;
  updateConversationPreview: (
    userId: string,
    lastMessage: string,
    timestamp: string
  ) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  messages: {},
  currentChatUserId: null,
  onlineUsers: new Set(),
  typingUsers: {},

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => {
      // Check if conversation already exists
      const exists = state.conversations.some(
        (c) => c.userId === conversation.userId
      );
      if (exists) return state;

      return {
        conversations: [conversation, ...state.conversations],
      };
    }),

  setMessages: (userId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [userId]: messages },
    })),

  addMessage: (message) =>
    set((state) => {
      // Determine the other user ID (for grouping messages)
      const otherUserId =
        message.senderId === state.currentChatUserId
          ? message.senderId
          : message.recipientId;

      const existingMessages = state.messages[otherUserId] || [];

      // Avoid duplicates
      if (existingMessages.some((m) => m.id === message.id)) {
        return state;
      }

      return {
        messages: {
          ...state.messages,
          [otherUserId]: [...existingMessages, message],
        },
      };
    }),

  setCurrentChatUserId: (userId) => set({ currentChatUserId: userId }),

  setUserOnline: (userId) =>
    set((state) => {
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.add(userId);

      return {
        onlineUsers: newOnlineUsers,
        conversations: state.conversations.map((conv) =>
          conv.userId === userId ? { ...conv, isOnline: true } : conv
        ),
      };
    }),

  setUserOffline: (userId) =>
    set((state) => {
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.delete(userId);

      return {
        onlineUsers: newOnlineUsers,
        conversations: state.conversations.map((conv) =>
          conv.userId === userId ? { ...conv, isOnline: false } : conv
        ),
      };
    }),

  setUserTyping: (userId, isTyping) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [userId]: isTyping },
    })),

  markMessagesAsRead: (userId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [userId]: (state.messages[userId] || []).map((msg) => ({
          ...msg,
          isRead: true,
        })),
      },
      conversations: state.conversations.map((conv) =>
        conv.userId === userId ? { ...conv, unreadCount: 0 } : conv
      ),
    })),

  updateConversationPreview: (userId, lastMessage, timestamp) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.userId === userId
          ? { ...conv, lastMessage, lastMessageTime: timestamp }
          : conv
      ),
    })),
}));
