import React, { useState, useMemo } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, Platform } from 'react-native';
import { borderRadius, fontSize, spacing } from '../../lib/theme';
import { useThemeColors } from '../../lib/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({ label, error, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const colors = useThemeColors();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    label: {
      color: colors.textSecondary,
      fontSize: fontSize.sm,
      marginBottom: spacing.xs,
      fontWeight: '500',
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md - 2,
      fontSize: fontSize.md,
      color: colors.text,
    },
    inputFocused: {
      borderColor: colors.amber,
      ...Platform.select({
        ios: {
          shadowColor: colors.amber,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    inputError: {
      borderColor: colors.error,
    },
    error: {
      color: colors.error,
      fontSize: fontSize.xs,
      marginTop: spacing.xs,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? styles.inputError : undefined,
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
