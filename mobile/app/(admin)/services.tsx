import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { fontSize, spacing, borderRadius } from '../../lib/theme';
import { useThemeColors } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import { Service } from '../../lib/types';
import ServiceCard from '../../components/ServiceCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ServicesScreen() {
  const { profileId } = useAuth();
  const colors = useThemeColors();
  const [services, setServices] = useState<Service[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('ARS');
  const [saving, setSaving] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: '700',
      color: colors.text,
    },
    list: {
      padding: spacing.xl,
      paddingTop: spacing.md,
    },
    empty: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.xxl,
      fontSize: fontSize.md,
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

  useFocusEffect(
    useCallback(() => {
      fetchServices();
    }, [])
  );

  async function fetchServices() {
    setLoading(true);
    try {
      const { data } = await api.get('/api/services/me');
      setServices(data.services || data || []);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setName('');
    setDescription('');
    setDuration('60');
    setPrice('');
    setCurrency('ARS');
    setModalVisible(true);
  }

  function openEdit(service: Service) {
    setEditingId(service.id);
    setName(service.name);
    setDescription(service.description || '');
    setDuration(String(service.durationMinutes));
    setPrice(String(service.price));
    setCurrency(service.currency);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!name || !price || !duration) {
      Alert.alert('Error', 'Nombre, duración y precio son obligatorios');
      return;
    }
    if (!profileId && !editingId) {
      Alert.alert('Error', 'No tienes un perfil profesional. Crea uno primero desde la web.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name,
        description: description || undefined,
        durationMinutes: parseInt(duration),
        price: parseFloat(price),
        currency,
      };
      if (editingId) {
        await api.put(`/api/services/${editingId}`, payload);
      } else {
        payload.profileId = profileId;
        await api.post('/api/services', payload);
      }
      setModalVisible(false);
      fetchServices();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || JSON.stringify(err.response?.data) || 'No se pudo guardar';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    Alert.alert('Eliminar servicio', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/services/${id}`);
            fetchServices();
          } catch {
            Alert.alert('Error', 'No se pudo eliminar');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Servicios</Text>
        <Button title="+ Nuevo" onPress={openCreate} size="sm" />
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ServiceCard
            service={item}
            isAdmin
            onEdit={() => openEdit(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await fetchServices();
            setRefreshing(false);
          }} tintColor={colors.amber} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Cargando...' : 'No tienes servicios. Crea uno.'}
          </Text>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Editar servicio' : 'Nuevo servicio'}
              </Text>

              <Input label="Nombre" value={name} onChangeText={setName} placeholder="Ej: Corte de cabello" />
              <Input
                label="Descripción (opcional)"
                value={description}
                onChangeText={setDescription}
                placeholder="Describe el servicio"
                multiline
                numberOfLines={3}
              />
              <Input
                label="Duración (minutos)"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                placeholder="60"
              />
              <Input
                label="Precio"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholder="5000"
              />
              <Input
                label="Moneda"
                value={currency}
                onChangeText={setCurrency}
                placeholder="ARS"
              />

              <Button
                title={editingId ? 'Guardar cambios' : 'Crear servicio'}
                onPress={handleSave}
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
