import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, userAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* Restore session from localStorage on mount */
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const phone = localStorage.getItem('phoneNumber');
    if (token && phone) {
      setUser({ phoneNumber: phone });
      connectSocket(token);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (phoneNumber) => {
    // 1) Ensure auth record exists
    await authAPI.upsert(phoneNumber);
    // 2) Verify (auto-verify for dev)
    await authAPI.verify(phoneNumber, '000000');
    // 3) Login – get tokens
    const res = await authAPI.login(phoneNumber);
    const { accessToken, refreshToken } = res.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('phoneNumber', phoneNumber);

    // 4) Ensure user profile exists in user-service
    try {
      await userAPI.createUser(phoneNumber);
    } catch {
      // already exists – fine
    }

    setUser({ phoneNumber });
    connectSocket(accessToken);

    return res;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('phoneNumber');
    disconnectSocket();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
