import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Modal, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Sun, Moon } from 'lucide-react-native';
import { fontSize, spacing, borderRadius } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import { uploadAvatar } from '../../lib/cloudinary';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ProfessionPicker from '../../components/ProfessionPicker';

export default function ProfileScreen() {
  const { user, profileId, avatar, logout, refreshUser } = useAuth();
  const { isDark, toggle, colors } = useTheme();
  const router = useRouter();

  // Create profile form
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [profession, setProfession] = useState('');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: '700',
      color: colors.text,
    },
    themeToggle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    avatarWrapper: {
      position: 'relative',
      marginBottom: spacing.md,
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
    },
    avatarImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 2,
      borderColor: colors.amber,
    },
    avatarText: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.amber,
    },
    cameraOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.amber,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.background,
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
      backgroundColor: colors.amberWashStrong,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      marginTop: spacing.md,
    },
    roleText: {
      color: colors.amber,
      fontSize: fontSize.xs,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
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
  }), [colors]);

  async function handlePickAvatar() {
    if (!profileId) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto de perfil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setUploading(true);
    try {
      const url = await uploadAvatar(uri);
      await api.put(`/api/profiles/${profileId}`, { avatar: url });
      await refreshUser();
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo subir la foto. Intentá de nuevo.');
    } finally {
      setUploading(false);
    }
  }

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
        <View style={styles.titleRow}>
          <Text style={styles.title}>Mi Perfil</Text>
          <TouchableOpacity style={styles.themeToggle} onPress={toggle} activeOpacity={0.7}>
            {isDark ? (
              <Sun size={20} color={colors.amber} />
            ) : (
              <Moon size={20} color={colors.amber} />
            )}
          </TouchableOpacity>
        </View>

        <Card style={styles.card}>
          <TouchableOpacity onPress={handlePickAvatar} disabled={!profileId || uploading} activeOpacity={0.7}>
            <View style={styles.avatarWrapper}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
              )}
              {profileId && (
                <View style={styles.cameraOverlay}>
                  {uploading ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Camera size={14} color={colors.text} />
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
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
