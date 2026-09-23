import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, queryClient, refreshSession, setToken } from './api';
import type { User } from './types';
type Auth = { user: User | null; loading: boolean; authenticate: (mode: 'login' | 'register', body: { email: string; password: string; name?: string }) => Promise<void>; logout: () => Promise<void>; updateUser: (user: User) => void; clear: () => void };
const AuthContext = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  const clear = useCallback(() => { setToken(null); setUser(null); queryClient.clear(); }, []);
  useEffect(() => { let alive = true; refreshSession().then(data => { if (alive) setUser(data.user); }).catch(() => { if (alive) setUser(null); }).finally(() => { if (alive) setLoading(false); }); window.addEventListener('session-expired', clear); return () => { alive = false; window.removeEventListener('session-expired', clear); }; }, [clear]);
  async function authenticate(mode: 'login' | 'register', body: { email: string; password: string; name?: string }) { const { data } = await api.post<{ user: User; accessToken: string }>(`/auth/${mode}`, body); queryClient.clear(); setToken(data.accessToken); setUser(data.user); }
  async function logout() { await api.post('/auth/logout'); clear(); }
  return <AuthContext.Provider value={{ user, loading, authenticate, logout, updateUser: setUser, clear }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const auth = useContext(AuthContext); if (!auth) throw new Error('Auth provider required'); return auth; }
