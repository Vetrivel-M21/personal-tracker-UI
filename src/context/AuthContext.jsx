import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient, ApiError } from '../api/apiClient.js';

const AuthContext = createContext(null);

// Fetch /api/me/stats and merge {current_streak, shields_remaining} into a user object.
async function withStats(user) {
  try {
    const stats = await apiClient.getMeStats();
    return { ...user, current_streak: stats.current_streak, shields_remaining: stats.shields_remaining };
  } catch {
    // Stats are a nice-to-have on top of the base user object - don't block on failure.
    return user;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiClient.getMe();
        const withStatsUser = await withStats(me);
        if (!cancelled) setUser(withStatsUser);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          if (!cancelled) setUser(null);
        } else if (!cancelled) {
          // Non-auth failure (e.g. network) - treat as logged out rather than crashing.
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth-expired', onExpired);
    return () => window.removeEventListener('auth-expired', onExpired);
  }, []);

  const login = useCallback(async (username, password) => {
    const me = await apiClient.login(username, password);
    const withStatsUser = await withStats(me);
    setUser(withStatsUser);
    return withStatsUser;
  }, []);

  const signUp = useCallback(async (username, password, displayName) => {
    const me = await apiClient.signup(username, password, displayName);
    const withStatsUser = await withStats(me);
    setUser(withStatsUser);
    return withStatsUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
