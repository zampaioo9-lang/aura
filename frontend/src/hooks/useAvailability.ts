import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/client';
import type { AvailabilitySlot, CreateSlotData, UpdateSlotData, BulkCreateData } from '../types/availability';

export function useAvailability(profileId?: string) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSlots = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/availability/me');
      const allSlots: AvailabilitySlot[] = res.data;
      // Filter by profileId if specified
      setSlots(profileId ? allSlots.filter(s => s.profileId === profileId) : allSlots);
    } catch {
      setError('Error al cargar disponibilidad');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const slotsByDay = useMemo(() => {
    const grouped: Record<number, AvailabilitySlot[]> = {};
    for (let d = 0; d < 7; d++) grouped[d] = [];
    for (const slot of slots) {
      grouped[slot.dayOfWeek].push(slot);
    }
    // Sort each day by startTime
    for (const d of Object.keys(grouped)) {
      grouped[Number(d)].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return grouped;
  }, [slots]);

  const createSlot = async (data: CreateSlotData) => {
    const res = await api.post('/availability', data);
    setSlots(prev => [...prev, res.data]);
    return res.data as AvailabilitySlot;
  };

  const updateSlot = async (id: string, data: UpdateSlotData) => {
    const res = await api.put(`/availability/${id}`, data);
    setSlots(prev => prev.map(s => s.id === id ? res.data : s));
    return res.data as AvailabilitySlot;
  };

  const deleteSlot = async (id: string) => {
    await api.delete(`/availability/${id}`);
    setSlots(prev => prev.filter(s => s.id !== id));
  };

  const bulkCreate = async (data: BulkCreateData) => {
    const res = await api.post('/availability/bulk', data);
    // Response is the full list after bulk create
    const allSlots: AvailabilitySlot[] = res.data;
    setSlots(profileId ? allSlots.filter(s => s.profileId === profileId) : allSlots);
    return allSlots;
  };

  const clearDay = async (dayOfWeek: number) => {
    await api.delete(`/availability/day/${dayOfWeek}`, {
      params: profileId ? { profileId } : undefined,
    });
    setSlots(prev => prev.filter(s => s.dayOfWeek !== dayOfWeek));
  };

  const toggleSlot = async (id: string) => {
    const res = await api.patch(`/availability/${id}/toggle`);
    setSlots(prev => prev.map(s => s.id === id ? res.data : s));
    return res.data as AvailabilitySlot;
  };

  return {
    slots,
    slotsByDay,
    loading,
    error,
    createSlot,
    updateSlot,
    deleteSlot,
    bulkCreate,
    clearDay,
    toggleSlot,
    refetch: fetchSlots,
  };
}
