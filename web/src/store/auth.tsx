import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

export interface AuthUser {
  id: string;
  role: 'student' | 'staff' | 'owner' | 'admin';
  email: string;
  name: string;
}

export interface Profile {
  university: string | null;
  student_id: string | null;
  default_notes: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    university?: string;
    studentId?: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await apiGet<{ user: AuthUser; profile: Profile | null }>('/api/auth/me');
      setUser(res.user);
      setProfile(res.profile);
    } catch {
      setUser(null);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    // On app load, check whether the session cookie is still valid.
    (async () => {
      await refreshProfile();
      setLoading(false);
    })();
  }, [refreshProfile]);

  // Keep the socket binding in sync with the signed-in user.
  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return;
    }
    connectSocket(user);
    return () => disconnectSocket();
  }, [user]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiPost<{ user: AuthUser }>('/api/auth/login', { email, password });
      setUser(res.user);
      const me = await apiGet<{ profile: Profile | null }>('/api/auth/me');
      setProfile(me.profile);
      return res.user;
    },
    [],
  );

  const register = useCallback(async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    university?: string;
    studentId?: string;
  }) => {
    const res = await apiPost<{ user: AuthUser }>('/api/auth/register', data);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost('/api/auth/logout', {});
    } catch {
      // Even if the request fails the server cookie should be cleared client-side.
    }
    setUser(null);
    setProfile(null);
    disconnectSocket();
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, login, register, logout, refreshProfile }),
    [user, profile, loading, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}