import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { fontSize, spacing } from '../lib/theme';
import { useThemeColors } from '../lib/ThemeContext';
import Button from '../components/ui/Button';
import { useEffect } from 'react';

export default function WelcomeScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    logoContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.amberWash,
      borderWidth: 2,
      borderColor: colors.amber,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    logoIcon: {
      fontSize: 44,
      fontWeight: '700',
      color: colors.amber,
    },
    logo: {
      fontSize: 52,
      fontWeight: '700',
      color: colors.amber,
      textAlign: 'center',
    },
    platformLabel: {
      fontSize: fontSize.xs,
      fontWeight: '600',
      color: colors.amberLight,
      textAlign: 'center',
      marginTop: spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 3,
      opacity: 0.7,
    },
    tagline: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    buttons: {
      width: '100%',
    },
  }), [colors]);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)/home');
    }
  }, [loading, user]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>Aura</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>A</Text>
          </View>
          <Text style={styles.logo}>Aura</Text>
          <Text style={styles.platformLabel}>PLATAFORMA DE RESERVAS</Text>
          <Text style={styles.tagline}>Tu presencia profesional empieza aqui</Text>
        </View>

        <View style={styles.buttons}>
          <Button
            title="Iniciar sesion"
            onPress={() => router.push('/(auth)/login')}
            size="lg"
          />
          <Button
            title="Crear cuenta"
            onPress={() => router.push('/(auth)/register')}
            variant="outline"
            size="lg"
            style={{ marginTop: spacing.md }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
