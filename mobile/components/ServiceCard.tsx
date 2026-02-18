import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './ui/Card';
import Button from './ui/Button';
import { fontSize, spacing } from '../lib/theme';
import { useThemeColors } from '../lib/ThemeContext';
import { Service } from '../lib/types';

interface ServiceCardProps {
  service: Service;
  onBook?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
}

export default function ServiceCard({ service, onBook, onEdit, onDelete, isAdmin = false }: ServiceCardProps) {
  const colors = useThemeColors();

  const styles = useMemo(() => StyleSheet.create({
    card: {
      marginBottom: spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    name: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '600',
      flex: 1,
    },
    price: {
      color: colors.amber,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    description: {
      color: colors.textSecondary,
      fontSize: fontSize.sm,
      marginBottom: spacing.xs,
    },
    duration: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
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

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{service.name}</Text>
        <Text style={styles.price}>
          ${service.price} {service.currency}
        </Text>
      </View>
      {service.description && (
        <Text style={styles.description} numberOfLines={2}>
          {service.description}
        </Text>
      )}
      <Text style={styles.duration}>{service.durationMinutes} min</Text>

      {isAdmin ? (
        <View style={styles.actions}>
          {onEdit && <Button title="Editar" onPress={onEdit} variant="outline" size="sm" style={styles.actionBtn} />}
          {onDelete && <Button title="Eliminar" onPress={onDelete} variant="danger" size="sm" style={styles.actionBtn} />}
        </View>
      ) : (
        onBook && (
          <Button title="Reservar" onPress={onBook} size="sm" style={{ marginTop: spacing.sm }} />
        )
      )}
    </Card>
  );
}
