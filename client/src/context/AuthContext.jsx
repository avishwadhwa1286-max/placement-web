import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  const logout = useCallback(() => { localStorage.removeItem('placement-token'); setUser(null); }, []);
  useEffect(() => {
    const onUnauthorized = () => logout(); window.addEventListener('placement:unauthorized', onUnauthorized);
    const token = localStorage.getItem('placement-token');
    if (!token) { setLoading(false); return () => window.removeEventListener('placement:unauthorized', onUnauthorized); }
    api.get('/auth/me').then(({ data }) => setUser(data.user)).catch(logout).finally(() => setLoading(false));
    return () => window.removeEventListener('placement:unauthorized', onUnauthorized);
  }, [logout]);
  const signIn = async credentials => { const { data } = await api.post('/auth/login', credentials); localStorage.setItem('placement-token', data.token); setUser(data.user); return data.user; };
  const register = async details => { const { data } = await api.post('/auth/register', details); localStorage.setItem('placement-token', data.token); setUser(data.user); return data.user; };
  const refreshUser = async () => { const { data } = await api.get('/auth/me'); setUser(data.user); return data.user; };
  return <AuthContext.Provider value={{ user, loading, signIn, register, logout, refreshUser }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
