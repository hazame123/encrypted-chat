import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { authAPI, messagesAPI } from '../services/api';
import {
  clearPrivateKey,
  encryptMessage,
  decryptMessage,
  getPrivateKey,
} from '../utils/crypto';
import { socketService } from '../services/socket';
import { UserSearch } from '../components/UserSearch';

export default function Chat() {
  const navigate = useNavigate();
  const { user, clearAuth, accessToken } = useAuthStore();
  const {
    conversations,
    messages,
    currentChatUserId,
    typingUsers,
    setConversations,
    setMessages,
    setCurrentChatUserId,
    addMessage,
    setUserOnline,
    setUserOffline,
    setUserTyping,
  } = useChatStore();

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [decryptedMessages, setDecryptedMessages] = useState<
    Record<string, string>
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const activeChat = conversations.find((c) => c.userId === currentChatUserId);
  const currentMessages = useMemo(
    () => (currentChatUserId ? messages[currentChatUserId] || [] : []),
    [currentChatUserId, messages]
  );
  const isOtherUserTyping = currentChatUserId
    ? typingUsers[currentChatUserId]
    : false;

  // Initialize WebSocket and load conversations
  useEffect(() => {
    if (!accessToken) return;

    // Connect WebSocket
    socketService.connect(accessToken);

    // Load conversations
    const loadConversations = async () => {
      try {
        const response = await messagesAPI.getConversations();
        setConversations(response.conversations);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    };

    loadConversations();

    // Setup WebSocket event handlers
    const unsubscribeMessage = socketService.onMessage((message) => {
      addMessage(message);
    });

    const unsubscribeTyping = socketService.onTyping((data) => {
      setUserTyping(data.userId, data.isTyping);
    });

    const unsubscribeOnline = socketService.onUserOnline((data) => {
      setUserOnline(data.userId);
    });

    const unsubscribeOffline = socketService.onUserOffline((data) => {
      setUserOffline(data.userId);
    });

    // Cleanup
    return () => {
      unsubscribeMessage();
      unsubscribeTyping();
      unsubscribeOnline();
      unsubscribeOffline();
      socketService.disconnect();
    };
  }, [
    accessToken,
    addMessage,
    setConversations,
    setUserOffline,
    setUserOnline,
    setUserTyping,
  ]);

  // Load messages when active chat changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentChatUserId) return;

      try {
        const response = await messagesAPI.getConversation(currentChatUserId);
        setMessages(currentChatUserId, response.messages);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    loadMessages();
  }, [currentChatUserId, setMessages]);

  // Decrypt messages
  useEffect(() => {
    const privateKey = getPrivateKey();
    if (!privateKey) return;

    const decryptAllMessages = async () => {
      const newDecrypted: Record<string, string> = {};

      for (const msg of currentMessages) {
        if (!decryptedMessages[msg.id]) {
          try {
            const decrypted = await decryptMessage(
              msg.encryptedContent,
              privateKey
            );
            newDecrypted[msg.id] = decrypted;
          } catch (error) {
            console.error('Failed to decrypt message:', error);
            newDecrypted[msg.id] = '[Unable to decrypt]';
          }
        }
      }

      if (Object.keys(newDecrypted).length > 0) {
        setDecryptedMessages((prev) => ({ ...prev, ...newDecrypted }));
      }
    };

    decryptAllMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentChatUserId || !activeChat) return;

    try {
      // Get recipient's public key
      const response = await messagesAPI.getUserPublicKey(currentChatUserId);
      const recipientPublicKey = response.publicKey;

      // Encrypt message
      const encryptedContent = await encryptMessage(
        newMessage,
        recipientPublicKey
      );

      // Send via WebSocket
      socketService.sendMessage({
        recipientId: currentChatUserId,
        encryptedContent,
      });

      setNewMessage('');
      setIsTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);

    if (!currentChatUserId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator
    if (value.length > 0) {
      if (!isTyping) {
        setIsTyping(true);
        socketService.sendTyping(currentChatUserId, true);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketService.sendTyping(currentChatUserId, false);
      }, 2000);
    } else {
      setIsTyping(false);
      socketService.sendTyping(currentChatUserId, false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      socketService.disconnect();
      clearPrivateKey();
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <div
      className={`h-screen flex overflow-hidden transition-colors duration-300 ${
        isDarkMode
          ? 'bg-slate-950 text-slate-200'
          : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Left Sidebar - Conversations */}
      <div
        className={`w-96 flex flex-col border-r backdrop-blur-md ${
          isDarkMode
            ? 'bg-slate-900/80 border-slate-800'
            : 'bg-white/90 border-slate-200'
        }`}
      >
        {/* Header */}
        <div
          className={`p-6 border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {user?.username?.[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">{user?.username}</h2>
              <p className="text-xs opacity-70">UI/UX Designer</p>
            </div>
            <button
              onClick={() => setShowUserSearch(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="New conversation"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="People, groups and messages"
              className={`w-full px-4 py-3 rounded-xl border transition-all outline-none text-sm ${
                isDarkMode
                  ? 'bg-white/10 border-white/20 text-white placeholder:text-white/40'
                  : 'bg-black/5 border-black/15 text-slate-900 placeholder:text-black/40'
              }`}
            />
            <svg
              className="w-5 h-5 absolute right-4 top-3.5 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3
                className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}
              >
                No conversations yet
              </h3>
              <p
                className={`text-sm mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}
              >
                Start a new conversation
              </p>
              <button
                onClick={() => setShowUserSearch(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                New Conversation
              </button>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => setCurrentChatUserId(conv.userId)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 ${
                  currentChatUserId === conv.userId ? 'bg-white/10' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                    {conv.username[0].toUpperCase()}
                  </div>
                  {conv.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">
                      {conv.username}
                    </span>
                    <span className="text-xs opacity-60">
                      {conv.lastMessageTime || '9:52'}
                    </span>
                  </div>
                  <p className="text-xs opacity-70 truncate">
                    {conv.lastMessage || 'Start chatting...'}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {conv.unreadCount}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Bottom Actions */}
        <div
          className={`p-4 border-t flex gap-3 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
        >
          {/* Theme Toggle */}
          <div
            className={`flex gap-1 p-1 rounded-full border backdrop-blur-md ${
              isDarkMode
                ? 'bg-white/10 border-white/15'
                : 'bg-white/60 border-black/10'
            }`}
          >
            <button
              className={`p-2.5 rounded-full transition-all ${
                isDarkMode
                  ? 'bg-white/20 text-indigo-400'
                  : 'bg-transparent text-slate-400'
              }`}
              onClick={() => setIsDarkMode(true)}
              title="Dark Mode"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            </button>
            <button
              className={`p-2.5 rounded-full transition-all ${
                !isDarkMode
                  ? 'bg-black/10 text-indigo-600'
                  : 'bg-transparent text-slate-400'
              }`}
              onClick={() => setIsDarkMode(false)}
              title="Light Mode"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex-1 px-4 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-full font-medium text-sm hover:bg-red-500/30 transition-colors"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Center - Active Chat */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div
              className={`p-6 border-b flex items-center justify-between ${
                isDarkMode
                  ? 'bg-slate-900/30 border-white/10'
                  : 'bg-white/60 border-black/10'
              } backdrop-blur-md`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium relative">
                  {activeChat.username[0].toUpperCase()}
                  {activeChat.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {activeChat.username}
                  </h3>
                  <p className="text-xs opacity-60">
                    {isOtherUserTyping
                      ? 'typing...'
                      : activeChat.isOnline
                        ? 'Active Now'
                        : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="p-2.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Add to favorites"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </button>
                <button
                  className="p-2.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Video call"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                <button
                  className="p-2.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Voice call"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {currentMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div
                    className={`text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}
                  >
                    <p>No messages yet</p>
                    <p className="text-sm">
                      Send a message to start the conversation
                    </p>
                  </div>
                </div>
              ) : (
                currentMessages.map((message) => {
                  const isOwn = message.senderId === user?.id;
                  const decryptedContent =
                    decryptedMessages[message.id] || 'Decrypting...';

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-md px-4 py-3 rounded-2xl ${
                          isOwn
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                            : isDarkMode
                              ? 'bg-white/10'
                              : 'bg-black/5'
                        }`}
                      >
                        <p className="text-sm break-words">
                          {decryptedContent}
                        </p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form
              onSubmit={handleSendMessage}
              className={`p-6 border-t ${
                isDarkMode
                  ? 'bg-slate-900/30 border-white/10'
                  : 'bg-white/60 border-black/10'
              } backdrop-blur-md`}
            >
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="p-2.5 hover:bg-white/10 rounded-lg transition-colors opacity-60 hover:opacity-100"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => handleTyping(e.target.value)}
                  placeholder="Type a message"
                  className={`flex-1 px-5 py-3.5 rounded-xl border-none transition-all outline-none ${
                    isDarkMode
                      ? 'bg-slate-800/80 text-white placeholder:text-white/30'
                      : 'bg-black/5 text-slate-900 placeholder:text-black/40'
                  }`}
                />
                <button
                  type="button"
                  className="p-2.5 hover:bg-white/10 rounded-lg transition-colors opacity-60 hover:opacity-100"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </button>
                <button
                  type="submit"
                  className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-pink-500/30"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-2xl font-semibold mb-2">
                Select a conversation
              </h3>
              <p className="opacity-70">
                Choose a chat from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* User Search Modal */}
      {showUserSearch && (
        <UserSearch
          onClose={() => setShowUserSearch(false)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}
