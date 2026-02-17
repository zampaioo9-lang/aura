import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import { AvailabilitySlot } from '../../lib/types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function AvailabilityScreen() {
  const { profileId } = useAuth();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Add slot form
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchSlots();
    }, [])
  );

  async function fetchSlots() {
    try {
      const { data } = await api.get('/api/availability/me');
      setSlots(data.slots || data || []);
    } catch {
      setSlots([]);
    }
  }

  async function handleSave() {
    if (selectedDay === null) {
      Alert.alert('Error', 'Selecciona un día');
      return;
    }
    if (!startTime || !endTime) {
      Alert.alert('Error', 'Completa los horarios');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/availability/bulk', {
        profileId,
        slots: [{ dayOfWeek: selectedDay, startTime, endTime }],
      });
      setSelectedDay(null);
      fetchSlots();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || JSON.stringify(err.response?.data) || 'No se pudo guardar';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Eliminar horario', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/availability/${id}`);
            fetchSlots();
          } catch {
            Alert.alert('Error', 'No se pudo eliminar');
          }
        },
      },
    ]);
  }

  // Group slots by day
  const slotsByDay: Record<number, AvailabilitySlot[]> = {};
  slots.forEach((s) => {
    if (!slotsByDay[s.dayOfWeek]) slotsByDay[s.dayOfWeek] = [];
    slotsByDay[s.dayOfWeek].push(s);
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await fetchSlots();
            setRefreshing(false);
          }} tintColor={colors.amber} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Disponibilidad</Text>
          <Text style={styles.subtitle}>Configura tus horarios semanales</Text>
        </View>

        {/* Add slot form */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Agregar horario</Text>

          <Text style={styles.label}>Día de la semana</Text>
          <View style={styles.daysGrid}>
            {DAYS.map((day, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dayChip, selectedDay === i && styles.dayChipActive]}
                onPress={() => setSelectedDay(i)}
              >
                <Text style={[styles.dayText, selectedDay === i && styles.dayTextActive]}>
                  {day.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <Input
                label="Inicio"
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
              />
            </View>
            <View style={styles.timeCol}>
              <Input
                label="Fin"
                value={endTime}
                onChangeText={setEndTime}
                placeholder="18:00"
              />
            </View>
          </View>

          <Button title="Agregar" onPress={handleSave} loading={saving} />
        </Card>

        {/* Current slots by day */}
        <View style={styles.slotsSection}>
          <Text style={styles.sectionTitle}>Horarios actuales</Text>
          {DAYS.map((day, i) => {
            const daySlots = slotsByDay[i];
            if (!daySlots || daySlots.length === 0) return null;
            return (
              <Card key={i} style={styles.dayCard}>
                <Text style={styles.dayTitle}>{day}</Text>
                {daySlots.map((slot) => (
                  <View key={slot.id} style={styles.slotRow}>
                    <Text style={styles.slotTime}>
                      {slot.startTime} - {slot.endTime}
                    </Text>
                    <TouchableOpacity onPress={() => handleDelete(slot.id)}>
                      <Text style={styles.deleteText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            );
          })}
          {slots.length === 0 && (
            <Text style={styles.empty}>No tienes horarios configurados</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  formCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  formTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipActive: {
    backgroundColor: colors.amberSubtle,
    borderColor: colors.amber,
  },
  dayText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  dayTextActive: {
    color: colors.amber,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeCol: {
    flex: 1,
  },
  slotsSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  dayCard: {
    marginBottom: spacing.md,
  },
  dayTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.amber,
    marginBottom: spacing.sm,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  slotTime: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  deleteText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: fontSize.md,
  },
});
