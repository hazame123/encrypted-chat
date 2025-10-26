import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import { clearPrivateKey } from '../utils/crypto';
import './Chat.css';

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
    <div className="chat-container">
      <nav className="chat-nav">
        <div className="chat-nav-content">
          <div className="nav-left">
            <h1 className="chat-title">Encrypted Chat</h1>
          </div>
          <div className="nav-right">
            <span className="user-info">
              Welcome, <span className="username">{user?.username}</span>
            </span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="chat-content">
        <div className="chat-placeholder">
          <div className="placeholder-icon">💬</div>
          <h2 className="placeholder-title">Chat Interface Coming Soon</h2>
          <p className="placeholder-description">
            The real-time messaging interface will be built in the next phase.
          </p>
          <div className="user-details">
            <p className="user-detail-title">Your Account:</p>
            <p>Username: {user?.username}</p>
            <p>Email: {user?.email}</p>
            <p>User ID: {user?.id}</p>
            <p className="encryption-note">
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
