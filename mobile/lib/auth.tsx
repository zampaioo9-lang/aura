import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from './api';
import { User } from './types';

interface AuthState {
  user: User | null;
  profileId: string | null;
  avatar: string | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function fetchUserAndProfile(t: string) {
    const { data } = await api.get('/api/auth/me');
    const u = data.user || data;
    setUser(u);

    // Try to find associated profile via /api/profiles/me
    try {
      const profileRes = await api.get('/api/profiles/me');
      const p = profileRes.data;
      if (p?.id) {
        setProfileId(p.id);
        setAvatar(p.avatar || null);
      }
    } catch {}
  }

  async function loadStoredAuth() {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      if (storedToken) {
        setToken(storedToken);
        await fetchUserAndProfile(storedToken);
      }
    } catch {
      await SecureStore.deleteItemAsync('token');
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { data } = await api.post('/api/auth/login', { email, password });
    const t = data.token;
    await SecureStore.setItemAsync('token', t);
    setToken(t);
    await fetchUserAndProfile(t);
  }

  async function register(info: { name: string; email: string; password: string; phone?: string }) {
    const { data } = await api.post('/api/auth/register', info);
    const t = data.token;
    await SecureStore.setItemAsync('token', t);
    setToken(t);
    await fetchUserAndProfile(t);
  }

  async function logout() {
    await SecureStore.deleteItemAsync('token');
    setToken(null);
    setUser(null);
    setProfileId(null);
    setAvatar(null);
  }

  async function refreshUser() {
    try {
      if (token) await fetchUserAndProfile(token);
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, profileId, avatar, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
