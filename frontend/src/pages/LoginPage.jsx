import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = phoneNumber.trim();

    if (!trimmed) {
      setError('Phone number is required');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(trimmed);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Animated background blobs */}
      <div className="login-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="login-card animate-scale-in">
        {/* Logo */}
        <div className="login-logo">
          <svg viewBox="0 0 48 48" width="56" height="56" fill="none">
            <circle cx="24" cy="24" r="24" fill="var(--primary)" opacity="0.15" />
            <path
              d="M24 8C15.16 8 8 14.83 8 23.25c0 2.96.87 5.72 2.37 8.05L8 40l9.07-2.3A16.07 16.07 0 0024 38.5C32.84 38.5 40 31.67 40 23.25S32.84 8 24 8z"
              fill="var(--primary)"
            />
            <path
              d="M32.2 27.58c-.45-.22-2.65-1.3-3.06-1.45-.41-.15-.7-.22-1 .23-.3.44-1.15 1.45-1.41 1.75-.26.3-.52.33-.97.11-.45-.22-1.89-.7-3.6-2.22-1.33-1.18-2.23-2.64-2.49-3.09-.26-.44-.03-.68.2-.9.2-.2.44-.52.67-.78.22-.26.3-.44.45-.74.15-.3.07-.56-.04-.78-.11-.22-.99-2.38-1.36-3.26-.36-.86-.72-.74-.99-.75h-.85c-.3 0-.78.11-1.18.56-.41.44-1.55 1.52-1.55 3.7s1.59 4.29 1.81 4.59c.22.3 3.13 4.78 7.59 6.7 1.06.46 1.89.73 2.54.94.53.17 1.02.14 1.4.09.43-.06 1.33-.55 1.52-1.07.19-.52.19-.97.13-1.07-.06-.1-.35-.22-.8-.44z"
              fill="white"
            />
          </svg>
        </div>

        <h1 className="login-title">WPClone</h1>
        <p className="login-subtitle">Enter your phone number to start messaging</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <div className="input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.81.36 1.6.66 2.35a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.75.3 1.54.53 2.35.66A2 2 0 0122 16.92z" />
              </svg>
            </div>
            <input
              id="phone-input"
              type="text"
              placeholder="+90 555 123 4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              autoFocus
              autoComplete="tel"
            />
          </div>

          {error && (
            <div className="login-error animate-fade-in">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <button
            id="login-btn"
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              <>
                Continue
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </form>

        <p className="login-footer">
          Secure end-to-end encrypted messaging
        </p>
      </div>
    </div>
  );
}
