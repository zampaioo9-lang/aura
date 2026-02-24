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
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  updateAccount: (data: UpdateAccountData) => Promise<void>;
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

  const logout = () => {
    localStorage.removeItem('aura_token');
    setToken(null);
    setUser(null);
  };

  const updateAccount = async (data: UpdateAccountData) => {
    const res = await api.patch('/auth/me', data);
    setUser(prev => prev ? { ...prev, ...res.data } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateAccount, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
