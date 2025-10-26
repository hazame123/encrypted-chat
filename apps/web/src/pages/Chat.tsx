import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import { clearPrivateKey } from '../utils/crypto';

export default function Chat() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearPrivateKey();
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-200">
      <nav className="bg-white/5 backdrop-blur-md border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              Encrypted Chat
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm opacity-90">
              Welcome,{' '}
              <span className="font-semibold text-indigo-500">
                {user?.username}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-white/10 border border-white/20 text-slate-200 rounded-lg text-sm font-medium hover:bg-white/15 hover:border-white/30 hover:-translate-y-0.5 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-16 text-center shadow-xl">
          <div className="text-8xl mb-6">💬</div>
          <h2 className="text-3xl font-semibold mb-4">
            Chat Interface Coming Soon
          </h2>
          <p className="text-lg opacity-80 mb-8">
            The real-time messaging interface will be built in the next phase.
          </p>
          <div className="max-w-lg mx-auto p-8 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
            <p className="font-semibold text-lg mb-4 text-indigo-500">
              Your Account:
            </p>
            <div className="space-y-2 opacity-90">
              <p>Username: {user?.username}</p>
              <p>Email: {user?.email}</p>
              <p>User ID: {user?.id}</p>
            </div>
            <p className="mt-6 pt-6 border-t border-white/10 text-xs opacity-70">
              🔒 Your messages are end-to-end encrypted. Your encryption keys
              are generated locally and your private key never leaves your
              device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
