import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './ui/Card';
import Button from './ui/Button';
import { fontSize, spacing } from '../lib/theme';
import { useThemeColors } from '../lib/ThemeContext';
import { Booking } from '../lib/types';

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No asistió',
};

interface BookingCardProps {
  booking: Booking;
  onCancel?: () => void;
  onConfirm?: () => void;
  onComplete?: () => void;
  onNoShow?: () => void;
  showActions?: boolean;
}

export default function BookingCard({
  booking,
  onCancel,
  onConfirm,
  onComplete,
  onNoShow,
  showActions = false,
}: BookingCardProps) {
  const colors = useThemeColors();

  const statusColors: Record<string, string> = useMemo(() => ({
    PENDING: colors.warning,
    CONFIRMED: colors.info,
    CANCELLED: colors.textMuted,
    COMPLETED: colors.success,
    NO_SHOW: colors.error,
  }), [colors]);

  const styles = useMemo(() => StyleSheet.create({
    card: {
      marginBottom: spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    headerLeft: {
      flex: 1,
    },
    serviceName: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '600',
    },
    clientName: {
      color: colors.textSecondary,
      fontSize: fontSize.sm,
      marginTop: 2,
    },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: fontSize.xs,
      fontWeight: '600',
    },
    details: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    detailText: {
      color: colors.textSecondary,
      fontSize: fontSize.sm,
    },
    detailDot: {
      color: colors.textMuted,
      marginHorizontal: spacing.sm,
    },
    email: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      marginBottom: spacing.sm,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    actionBtn: {
      flex: 1,
    },
  }), [colors]);

  const date = new Date(booking.date).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.serviceName}>{booking.service?.name || 'Servicio'}</Text>
          <Text style={styles.clientName}>{booking.clientName}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColors[booking.status] + '20' }]}>
          <Text style={[styles.badgeText, { color: statusColors[booking.status] }]}>
            {statusLabels[booking.status]}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.detailText}>{date}</Text>
        <Text style={styles.detailDot}>·</Text>
        <Text style={styles.detailText}>{booking.startTime} - {booking.endTime}</Text>
      </View>

      {booking.clientEmail && (
        <Text style={styles.email}>{booking.clientEmail}</Text>
      )}

      {showActions && booking.status === 'PENDING' && (
        <View style={styles.actions}>
          {onConfirm && <Button title="Confirmar" onPress={onConfirm} size="sm" style={styles.actionBtn} />}
          {onCancel && <Button title="Cancelar" onPress={onCancel} variant="danger" size="sm" style={styles.actionBtn} />}
        </View>
      )}

      {showActions && booking.status === 'CONFIRMED' && (
        <View style={styles.actions}>
          {onComplete && <Button title="Completar" onPress={onComplete} size="sm" style={styles.actionBtn} />}
          {onNoShow && <Button title="No asistió" onPress={onNoShow} variant="outline" size="sm" style={styles.actionBtn} />}
          {onCancel && <Button title="Cancelar" onPress={onCancel} variant="danger" size="sm" style={styles.actionBtn} />}
        </View>
      )}

      {!showActions && booking.status === 'PENDING' && onCancel && (
        <View style={styles.actions}>
          <Button title="Cancelar reserva" onPress={onCancel} variant="outline" size="sm" />
        </View>
      )}
    </Card>
  );
}
