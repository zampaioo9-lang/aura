import { useState } from 'react';
import { View, Text, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ProfessionPicker from '../../components/ProfessionPicker';

export default function ProfileScreen() {
  const { user, profileId, logout, refreshUser } = useAuth();
  const router = useRouter();

  // Create profile form
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [profession, setProfession] = useState('');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  }

  function openCreateProfile() {
    setTitle(user?.name || '');
    setProfession('');
    setSlug(
      (user?.name || '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
    );
    setBio('');
    setPhone('');
    setModalVisible(true);
  }

  async function handleCreateProfile() {
    if (!title || !profession || !slug) {
      Alert.alert('Error', 'Título, profesión y slug son obligatorios');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/profiles', {
        title: title.trim(),
        profession: profession.trim(),
        slug: slug.trim().toLowerCase(),
        bio: bio.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setModalVisible(false);
      await refreshUser();
      Alert.alert('Perfil creado', 'Tu perfil profesional ha sido creado. Ya podés acceder al panel de administración.');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || JSON.stringify(err.response?.data) || 'No se pudo crear el perfil';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mi Perfil</Text>

        <Card style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role || 'Cliente'}</Text>
          </View>
        </Card>

        {profileId ? (
          <Button
            title="Panel de Administración"
            onPress={() => router.push('/(admin)/dashboard')}
            variant="outline"
            size="lg"
            style={{ marginTop: spacing.lg }}
          />
        ) : (
          <Card style={styles.proCard}>
            <Text style={styles.proTitle}>¿Sos profesional?</Text>
            <Text style={styles.proDesc}>
              Creá tu perfil profesional para ofrecer servicios, gestionar citas y configurar tu disponibilidad.
            </Text>
            <Button
              title="Crear perfil profesional"
              onPress={openCreateProfile}
              size="lg"
              style={{ marginTop: spacing.md }}
            />
          </Card>
        )}

        <Button
          title="Cerrar sesión"
          onPress={handleLogout}
          variant="danger"
          size="lg"
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Crear perfil profesional</Text>

              <Input
                label="Título / Nombre del negocio"
                value={title}
                onChangeText={setTitle}
                placeholder="Ej: María López Estética"
              />
              <ProfessionPicker value={profession} onSelect={setProfession} />
              <Input
                label="Slug (URL de tu perfil)"
                value={slug}
                onChangeText={(t) => setSlug(t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                autoCapitalize="none"
                placeholder="ej: maria-lopez"
              />
              <Input
                label="Biografía (opcional)"
                value={bio}
                onChangeText={setBio}
                placeholder="Contá sobre vos y tus servicios..."
                multiline
                numberOfLines={3}
              />
              <Input
                label="Teléfono (opcional)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+54 11 1234-5678"
              />

              <Button
                title="Crear perfil"
                onPress={handleCreateProfile}
                loading={saving}
                size="lg"
              />
              <Button
                title="Cancelar"
                onPress={() => setModalVisible(false)}
                variant="ghost"
                style={{ marginTop: spacing.sm }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.amberSubtle,
    borderWidth: 2,
    borderColor: colors.amber,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.amber,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  email: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  roleBadge: {
    backgroundColor: colors.amberSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginTop: spacing.md,
  },
  roleText: {
    color: colors.amber,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  proCard: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  proTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.amber,
  },
  proDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
});
