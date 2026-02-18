import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { borderRadius, fontSize, spacing } from '../lib/theme';
import { useThemeColors } from '../lib/ThemeContext';
import api from '../lib/api';

interface SlotPickerProps {
  profileId: string;
  serviceId: string;
  onSelect: (date: string, time: string) => void;
}

export default function SlotPicker({ profileId, serviceId, onSelect }: SlotPickerProps) {
  const colors = useThemeColors();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dates] = useState(() => {
    const d: { label: string; value: string }[] = [];
    for (let i = 1; i <= 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      d.push({
        label: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
        value: date.toISOString().split('T')[0],
      });
    }
    return d;
  });

  const styles = useMemo(() => StyleSheet.create({
    container: {
      marginTop: spacing.md,
    },
    title: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    dateScroll: {
      flexGrow: 0,
    },
    dateChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: spacing.sm,
    },
    dateChipActive: {
      backgroundColor: colors.amberSubtle,
      borderColor: colors.amber,
    },
    dateText: {
      color: colors.textSecondary,
      fontSize: fontSize.sm,
    },
    dateTextActive: {
      color: colors.amber,
      fontWeight: '600',
    },
    noSlots: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      marginTop: spacing.sm,
    },
    slotsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    slotChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    slotChipActive: {
      backgroundColor: colors.amber,
      borderColor: colors.amber,
    },
    slotText: {
      color: colors.textSecondary,
      fontSize: fontSize.sm,
    },
    slotTextActive: {
      color: colors.background,
      fontWeight: '600',
    },
  }), [colors]);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots();
    }
  }, [selectedDate]);

  async function fetchSlots() {
    setLoading(true);
    setSelectedTime('');
    try {
      const { data } = await api.get('/api/bookings/available-slots', {
        params: { profileId, serviceId, date: selectedDate },
      });
      setSlots(data.slots || data || []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  function handleTimeSelect(time: string) {
    setSelectedTime(time);
    onSelect(selectedDate, time);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seleccionar fecha</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
        {dates.map((d) => (
          <TouchableOpacity
            key={d.value}
            style={[styles.dateChip, selectedDate === d.value && styles.dateChipActive]}
            onPress={() => setSelectedDate(d.value)}
          >
            <Text style={[styles.dateText, selectedDate === d.value && styles.dateTextActive]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedDate && (
        <>
          <Text style={[styles.title, { marginTop: spacing.md }]}>Seleccionar hora</Text>
          {loading ? (
            <ActivityIndicator color={colors.amber} style={{ marginTop: spacing.md }} />
          ) : slots.length === 0 ? (
            <Text style={styles.noSlots}>No hay horarios disponibles para esta fecha</Text>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[styles.slotChip, selectedTime === time && styles.slotChipActive]}
                  onPress={() => handleTimeSelect(time)}
                >
                  <Text style={[styles.slotText, selectedTime === time && styles.slotTextActive]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}
