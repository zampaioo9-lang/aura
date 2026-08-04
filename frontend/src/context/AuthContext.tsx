import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/client';

interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar?: string;
  socialLinks?: Record<string, string>;
  isAdmin?: boolean;
  trialEndsAt?: string | null;
  plan?: string | null;
  planInterval?: string | null;
  planExpiresAt?: string | null;
  blocked?: boolean;
  featureOverrides?: Record<string, boolean>;
}

interface UpdateAccountData {
  name?: string;
  bio?: string;
  email?: string;
  socialLinks?: Record<string, string>;
  currentPassword?: string;
  newPassword?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isPro: boolean;
  isClinico: boolean;
  featureOverrides: Record<string, boolean>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  logout: () => void;
  updateAccount: (data: UpdateAccountData) => Promise<void>;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('aura_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch((err) => {
          // Solo borrar el token si el servidor rechaza explícitamente las credenciales
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('aura_token');
            setToken(null);
          }
          // Para otros errores (500, red, etc.) mantener el token
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('aura_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const res = await api.post('/auth/register', { name, email, password, phone });
    localStorage.setItem('aura_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    const res = await api.post('/auth/reset-password', { token, newPassword });
    localStorage.setItem('aura_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('aura_token');
    setToken(null);
    setUser(null);
  };

  const updateAccount = async (data: UpdateAccountData) => {
    const res = await api.patch('/auth/me', data);
    setUser(prev => prev ? { ...prev, ...res.data } : prev);
  };

  const refreshUser = async () => {
    const res = await api.get('/auth/me');
    setUser(res.data);
  };

  const isPro = (() => {
    if (!user) return false;
    if (user.isAdmin) return true;
    if (!user.plan) return false;
    if (user.plan === 'LIFETIME') return true;
    if (user.plan === 'PRO') {
      if (!user.planExpiresAt) return true;
      return new Date(user.planExpiresAt) > new Date();
    }
    return false;
  })();

  const isClinico = (() => {
    if (!user) return false;
    if (user.isAdmin) return true;
    if (user.plan !== 'CLINICO') return false;
    if (!user.planExpiresAt) return true;
    return new Date(user.planExpiresAt) > new Date();
  })();

  const featureOverrides = (user?.featureOverrides ?? {}) as Record<string, boolean>;

  return (
    <AuthContext.Provider value={{ user, token, isPro, isClinico, featureOverrides, login, register, resetPassword, logout, updateAccount, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
