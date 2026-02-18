import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, Platform } from 'react-native';
import { borderRadius, fontSize, spacing } from '../../lib/theme';
import { useThemeColors } from '../../lib/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;

  const styles = useMemo(() => StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.full,
    },
    primary: {
      backgroundColor: colors.amber,
      ...Platform.select({
        ios: {
          shadowColor: colors.amber,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    secondary: {
      backgroundColor: colors.surfaceLight,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.amber,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    danger: {
      backgroundColor: colors.error,
    },
    size_sm: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    size_md: {
      paddingVertical: spacing.md - 2,
      paddingHorizontal: spacing.lg,
    },
    size_lg: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    disabled: {
      opacity: 0.5,
    },
    text: {
      fontWeight: '600',
    },
    text_primary: {
      color: colors.background,
    },
    text_secondary: {
      color: colors.text,
    },
    text_outline: {
      color: colors.amber,
    },
    text_ghost: {
      color: colors.amber,
    },
    text_danger: {
      color: '#fff',
    },
    textSize_sm: {
      fontSize: fontSize.sm,
    },
    textSize_md: {
      fontSize: fontSize.md,
    },
    textSize_lg: {
      fontSize: fontSize.lg,
    },
  }), [colors]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.amber : colors.background} />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
