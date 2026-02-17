import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export interface Service {
  id: string;
  profileId: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number | string;
  currency: string;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profile?: { id: string; title: string; slug: string };
}

export interface ServiceStats {
  total: number;
  active: number;
  inactive: number;
  limit: number;
}

export interface CreateServiceData {
  profileId: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  currency: string;
  durationMinutes: number;
}

export interface UpdateServiceData {
  name?: string;
  description?: string;
  image?: string;
  price?: number;
  currency?: string;
  durationMinutes?: number;
  isActive?: boolean;
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<ServiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/services/me');
      setServices(res.data.services);
      setStats(res.data.stats);
    } catch {
      setError('Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  }, []);

  const createService = useCallback(async (data: CreateServiceData): Promise<Service | null> => {
    try {
      const res = await api.post('/services', data);
      setServices(prev => [res.data, ...prev]);
      setStats(prev => prev ? { ...prev, total: prev.total + 1, active: prev.active + 1 } : prev);
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error al crear servicio';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const updateService = useCallback(async (id: string, data: UpdateServiceData): Promise<Service | null> => {
    try {
      const res = await api.put(`/services/${id}`, data);
      setServices(prev => prev.map(s => s.id === id ? res.data : s));
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error al actualizar servicio';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const deleteService = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/services/${id}`);
      setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: false } : s));
      setStats(prev => prev ? { ...prev, active: prev.active - 1, inactive: prev.inactive + 1 } : prev);
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error al eliminar servicio';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const toggleService = useCallback(async (id: string): Promise<Service | null> => {
    try {
      const res = await api.patch(`/services/${id}/toggle`);
      setServices(prev => prev.map(s => s.id === id ? res.data : s));
      const wasActive = services.find(s => s.id === id)?.isActive;
      setStats(prev => {
        if (!prev) return prev;
        return wasActive
          ? { ...prev, active: prev.active - 1, inactive: prev.inactive + 1 }
          : { ...prev, active: prev.active + 1, inactive: prev.inactive - 1 };
      });
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error al cambiar estado';
      setError(msg);
      throw new Error(msg);
    }
  }, [services]);

  const refetch = useCallback(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services,
    stats,
    loading,
    error,
    setError,
    createService,
    updateService,
    deleteService,
    toggleService,
    refetch,
  };
}
