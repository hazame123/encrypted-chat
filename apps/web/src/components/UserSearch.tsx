import { useState } from 'react';
import { usersAPI } from '../services/api';
import { useChatStore } from '../store/chatStore';
import type { User } from '@encrypted-chat/shared';

interface UserSearchProps {
  onClose: () => void;
  isDarkMode: boolean;
}

// eslint-disable-next-line react/prop-types
export const UserSearch: React.FC<UserSearchProps> = ({
  onClose,
  isDarkMode,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { addConversation, setCurrentChatUserId } = useChatStore();

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);

    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await usersAPI.searchUsers(searchQuery);
      setResults(response.users || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = (user: User) => {
    addConversation({
      userId: user.id,
      username: user.username,
      unreadCount: 0,
      isOnline: false,
    });
    setCurrentChatUserId(user.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${
          isDarkMode
            ? 'bg-slate-900 border border-slate-800'
            : 'bg-white border border-slate-200'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Search Users</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'hover:bg-white/10 text-slate-400 hover:text-slate-200'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by username or email..."
          className={`w-full px-4 py-3 rounded-xl border transition-all outline-none ${
            isDarkMode
              ? 'bg-white/10 border-white/20 text-white placeholder:text-white/40'
              : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
          }`}
          autoFocus
        />

        <div className="mt-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div
              className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
            >
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition ${
                    isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{user.username}</div>
                    <div
                      className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      {user.email}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div
              className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
            >
              No users found
            </div>
          ) : (
            <div
              className={`text-center py-8 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}
            >
              Type at least 2 characters to search
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
