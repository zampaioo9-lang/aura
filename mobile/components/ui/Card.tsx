import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { borderRadius, spacing } from '../../lib/theme';
import { useThemeColors } from '../../lib/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function Card({ children, style }: CardProps) {
  const colors = useThemeColors();

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.glass,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: spacing.md,
    },
  }), [colors]);

  return <View style={[styles.card, style]}>{children}</View>;
}
