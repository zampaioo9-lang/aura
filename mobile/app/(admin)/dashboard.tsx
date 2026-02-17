import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { colors, fontSize, spacing } from '../../lib/theme';
import api from '../../lib/api';
import { Booking } from '../../lib/types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function DashboardScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  async function fetchBookings() {
    try {
      const { data } = await api.get('/api/bookings/professional');
      setBookings(data.bookings || data || []);
    } catch {
      setBookings([]);
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter((b) => b.date?.startsWith(today));
  const pending = bookings.filter((b) => b.status === 'PENDING');
  const confirmed = bookings.filter((b) => b.status === 'CONFIRMED');
  const completed = bookings.filter((b) => b.status === 'COMPLETED');

  const stats = [
    { label: 'Citas hoy', value: todayBookings.length, color: colors.amber },
    { label: 'Pendientes', value: pending.length, color: colors.warning },
    { label: 'Confirmadas', value: confirmed.length, color: colors.info },
    { label: 'Completadas', value: completed.length, color: colors.success },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await fetchBookings();
            setRefreshing(false);
          }} tintColor={colors.amber} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Panel de administración</Text>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <Card key={stat.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Card>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <Button
            title="Volver al modo cliente"
            onPress={() => router.replace('/(tabs)/home')}
            variant="outline"
            size="lg"
          />
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
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.amber,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statValue: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
});
