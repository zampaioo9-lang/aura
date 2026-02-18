import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { fontSize, spacing } from '../../lib/theme';
import { useThemeColors } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import { Booking } from '../../lib/types';
import BookingCard from '../../components/BookingCard';
import Button from '../../components/ui/Button';

const FILTERS = ['TODAS', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;
const FILTER_LABELS: Record<string, string> = {
  TODAS: 'Todas',
  PENDING: 'Pendientes',
  CONFIRMED: 'Confirmadas',
  COMPLETED: 'Completadas',
  CANCELLED: 'Canceladas',
};

export default function BookingsScreen() {
  const { user } = useAuth();
  const colors = useThemeColors();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('TODAS');

  const styles = useMemo(() => StyleSheet.create({
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
    subtitle: {
      fontSize: fontSize.xs,
      color: colors.amber,
      marginTop: spacing.sm,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      opacity: 0.7,
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
  }), [colors]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [user])
  );

  async function fetchBookings() {
    if (!user?.email) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/bookings/client/${encodeURIComponent(user.email)}`);
      setBookings(data.bookings || data || []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    Alert.alert('Cancelar reserva', '¿Estás seguro de que quieres cancelar esta reserva?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/api/bookings/${id}/cancel`);
            fetchBookings();
          } catch {
            Alert.alert('Error', 'No se pudo cancelar la reserva');
          }
        },
      },
    ]);
  }

  const filtered = filter === 'TODAS' ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Reservas</Text>
        <Text style={styles.subtitle}>TUS CITAS AGENDADAS</Text>
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
            onCancel={
              item.status === 'PENDING' || item.status === 'CONFIRMED'
                ? () => handleCancel(item.id)
                : undefined
            }
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
            {loading ? 'Cargando...' : 'No tienes reservas'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}
