import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { fontSize, spacing } from '../../lib/theme';
import { useThemeColors } from '../../lib/ThemeContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: fontSize.sm,
      color: colors.amber,
      marginBottom: spacing.xl,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      opacity: 0.7,
    },
    error: {
      color: colors.error,
      fontSize: fontSize.sm,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
  }), [colors]);

  async function handleRegister() {
    if (!name || !email || !password) {
      setError('Nombre, email y contraseña son obligatorios');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });
      router.replace('/(tabs)/home');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Únete a Aura</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Input
            label="Nombre"
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="tu@email.com"
          />
          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Mínimo 6 caracteres"
          />
          <Input
            label="Teléfono (opcional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+54 11 1234-5678"
          />

          <Button title="Crear cuenta" onPress={handleRegister} loading={loading} size="lg" />

          <Button
            title="¿Ya tienes cuenta? Inicia sesión"
            onPress={() => router.replace('/(auth)/login')}
            variant="ghost"
            style={{ marginTop: spacing.md }}
          />

          <Button
            title="Volver"
            onPress={() => router.back()}
            variant="ghost"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
