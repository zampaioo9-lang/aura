import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { colors, fontSize, spacing } from '../lib/theme';
import Button from '../components/ui/Button';
import { useEffect } from 'react';

export default function WelcomeScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
          <Text style={styles.tagline}>Tu bienestar, a un toque de distancia</Text>
        </View>

        <View style={styles.buttons}>
          <Button
            title="Iniciar sesión"
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

const styles = StyleSheet.create({
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
    backgroundColor: colors.amberSubtle,
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
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  buttons: {
    width: '100%',
  },
});
