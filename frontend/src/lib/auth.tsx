import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';

type User = { id: number; email: string; fullName: string; role: 'ADMIN' | 'STOREKEEPER' | 'ENGINEER' | 'MANAGEMENT' | 'GUEST' };
type Lookups = { sections: { name: string }[]; sites: { name: string }[]; people: { name: string; email?: string; section?: string }[]; storekeeper: string };
const Ctx = createContext<{ user: User | null; lookups: Lookups | null; login: (e: string, p: string) => Promise<void>; loginGuest: (name: string, email: string) => Promise<void>; logout: () => void; ready: boolean }>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [ready, setReady] = useState(false);
  const loadLookups = () => api<Lookups>('/lookups').then(setLookups).catch(() => {});
  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api<User>('/auth/me').then((u) => { setUser(u); loadLookups(); }).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);
  const login = async (email: string, password: string) => {
    const r = await api<{ accessToken: string; user: User }>('/auth/login', { body: { email, password } });
    setToken(r.accessToken); setUser(r.user); loadLookups();
  };
  /** General loan: continue as guest with name + email (no account). */
  const loginGuest = async (name: string, email: string) => {
    const r = await api<{ accessToken: string; user: User }>('/auth/guest', { body: { name, email } });
    setToken(r.accessToken); setUser(r.user); loadLookups();
  };
  const logout = () => { setToken(null); setUser(null); };
  return <Ctx.Provider value={{ user, lookups, login, loginGuest, logout, ready }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
/** Storekeeper and admin can do everything; engineers can borrow; management is read-only. */
export const can = (u: User | null, action: 'borrow' | 'store') =>
  !!u && (u.role === 'ADMIN' || u.role === 'STOREKEEPER' || (action === 'borrow' && u.role === 'ENGINEER'));
