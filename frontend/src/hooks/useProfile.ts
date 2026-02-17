import { useState, useEffect } from 'react';
import api from '../api/client';

interface Profile {
  id: string;
  slug: string;
  title: string;
  bio: string | null;
  profession: string;
  phone: string | null;
  template: string;
  avatar: string | null;
  coverImage: string | null;
  videoUrl: string | null;
  customization: any;
  socialLinks: Record<string, string>;
  availability: Record<string, { start: string; end: string }[]>;
  published: boolean;
  services: any[];
}

export function useMyProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/profiles/me');
      setProfile(res.data);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setProfile(null);
      } else {
        setError('Error al cargar perfil');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  return { profile, loading, error, refetch: fetchProfile };
}

export function useCheckUsername() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const check = async (username: string, currentSlug?: string) => {
    if (username.length < 3) {
      setAvailable(null);
      return;
    }
    if (username === currentSlug) {
      setAvailable(true);
      return;
    }
    setChecking(true);
    try {
      const res = await api.get(`/profiles/check-username/${username}`);
      setAvailable(res.data.available);
    } catch {
      setAvailable(null);
    } finally {
      setChecking(false);
    }
  };

  return { available, checking, check };
}
