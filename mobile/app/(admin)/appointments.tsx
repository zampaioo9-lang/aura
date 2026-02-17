import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { colors, fontSize, spacing } from '../../lib/theme';
import api from '../../lib/api';
import { Booking } from '../../lib/types';
import BookingCard from '../../components/BookingCard';
import Button from '../../components/ui/Button';

const FILTERS = ['TODAS', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;
const FILTER_LABELS: Record<string, string> = {
  TODAS: 'Todas',
  PENDING: 'Pendientes',
  CONFIRMED: 'Confirmadas',
  COMPLETED: 'Completadas',
  CANCELLED: 'Canceladas',
  NO_SHOW: 'No asistió',
};

export default function AppointmentsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('TODAS');

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  async function fetchBookings() {
    setLoading(true);
    try {
      const { data } = await api.get('/api/bookings/professional');
      setBookings(data.bookings || data || []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: string, label: string) {
    Alert.alert(label, `¿${label} esta cita?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            await api.put(`/api/bookings/${id}/${action}`);
            fetchBookings();
          } catch {
            Alert.alert('Error', `No se pudo ${label.toLowerCase()} la cita`);
          }
        },
      },
    ]);
  }

  const filtered = filter === 'TODAS' ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestionar Citas</Text>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Button
            key={f}
            title={FILTER_LABELS[f]}
            variant={filter === f ? 'primary' : 'ghost'}
            size="sm"
            onPress={() => setFilter(f)}
          />
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            showActions
            onConfirm={() => handleAction(item.id, 'confirm', 'Confirmar')}
            onCancel={() => handleAction(item.id, 'cancel', 'Cancelar')}
            onComplete={() => handleAction(item.id, 'complete', 'Completar')}
            onNoShow={() => handleAction(item.id, 'no-show', 'Marcar como no asistió')}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await fetchBookings();
            setRefreshing(false);
          }} tintColor={colors.amber} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Cargando...' : 'No hay citas'}
          </Text>
        }
      />
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
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  list: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
    fontSize: fontSize.md,
  },
});
