import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { fontSize, spacing, borderRadius } from '../../lib/theme';
import { useThemeColors } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import { Profile, Service } from '../../lib/types';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ServiceCard from '../../components/ServiceCard';
import SlotPicker from '../../components/SlotPicker';
import { PROFESSION_CATEGORIES } from '../../lib/professions';

interface ProfileWithServices extends Profile {
  services?: Service[];
  user?: { name: string; email: string };
}

type ScreenState = 'directory' | 'professionals' | 'profile';

export default function HomeScreen() {
  const { user } = useAuth();
  const colors = useThemeColors();
  const [profiles, setProfiles] = useState<ProfileWithServices[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Navigation state
  const [screen, setScreen] = useState<ScreenState>('directory');
  const [selectedProfession, setSelectedProfession] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithServices | null>(null);

  // Booking modal state
  const [bookingModal, setBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState(user?.name || '');
  const [clientEmail, setClientEmail] = useState(user?.email || '');
  const [clientPhone, setClientPhone] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: fontSize.xs,
      color: colors.amber,
      marginTop: spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      opacity: 0.7,
    },
    backBtn: {
      color: colors.amber,
      fontSize: fontSize.md,
      fontWeight: '600',
      paddingVertical: spacing.sm,
    },
    searchContainer: {
      paddingHorizontal: spacing.xl,
      marginTop: spacing.md,
    },
    searchInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md - 2,
      fontSize: fontSize.md,
      color: colors.text,
    },
    directoryList: {
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
    },
    categoryHeader: {
      backgroundColor: colors.amberWash,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
    },
    categoryText: {
      color: colors.amber,
      fontSize: fontSize.xs,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    professionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
    },
    professionText: {
      color: colors.text,
      fontSize: fontSize.md,
      flex: 1,
    },
    professionRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    countBadge: {
      backgroundColor: colors.amberSubtle,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 24,
      alignItems: 'center',
    },
    countText: {
      color: colors.amber,
      fontSize: fontSize.xs,
      fontWeight: '700',
    },
    list: {
      padding: spacing.xl,
      paddingTop: spacing.md,
    },
    proCard: {
      marginBottom: spacing.md,
    },
    proRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    proAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.amberSubtle,
      borderWidth: 1.5,
      borderColor: colors.amber,
      justifyContent: 'center',
      alignItems: 'center',
    },
    proAvatarImage: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 1.5,
      borderColor: colors.amber,
    },
    proAvatarText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.amber,
    },
    proInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    proName: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.text,
    },
    proBio: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    proServices: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: 2,
    },
    proArrow: {
      fontSize: 24,
      color: colors.textMuted,
      marginLeft: spacing.sm,
    },
    profileDetail: {
      alignItems: 'center',
      marginBottom: spacing.lg,
      paddingVertical: spacing.xl,
    },
    profileAvatar: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: colors.amberSubtle,
      borderWidth: 2,
      borderColor: colors.amber,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    profileAvatarImage: {
      width: 70,
      height: 70,
      borderRadius: 35,
      borderWidth: 2,
      borderColor: colors.amber,
      marginBottom: spacing.md,
    },
    profileAvatarText: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.amber,
    },
    profileDetailName: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: colors.text,
    },
    profileDetailProfession: {
      fontSize: fontSize.md,
      color: colors.amber,
      marginTop: spacing.xs,
    },
    profileDetailBio: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    servicesCount: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      fontWeight: '600',
      marginTop: spacing.md,
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
    modalActions: {
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
    },
  }), [colors]);

  useFocusEffect(
    useCallback(() => {
      fetchProfiles();
    }, [])
  );

  async function fetchProfiles() {
    setLoading(true);
    try {
      const { data } = await api.get('/api/profiles/directory');
      const list: ProfileWithServices[] = Array.isArray(data) ? data : data.profiles || [];
      setProfiles(list);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }

  const existingProfessions = useMemo(() => {
    const profSet = new Set(profiles.map((p) => p.profession).filter((p): p is string => !!p));
    return profSet;
  }, [profiles]);

  const availableCategories = useMemo(() => {
    return PROFESSION_CATEGORIES
      .map((cat) => ({
        ...cat,
        professions: cat.professions.filter((p) => existingProfessions.has(p)),
      }))
      .filter((cat) => cat.professions.length > 0);
  }, [existingProfessions]);

  const uncategorizedProfessions = useMemo(() => {
    const allPredefined = new Set(PROFESSION_CATEGORIES.flatMap((c) => c.professions));
    return [...existingProfessions].filter((p): p is string => !allPredefined.has(p));
  }, [existingProfessions]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return availableCategories;
    const q = search.toLowerCase();
    return availableCategories
      .map((cat) => ({
        ...cat,
        professions: cat.professions.filter(
          (p) => p.toLowerCase().includes(q) || cat.category.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.professions.length > 0);
  }, [availableCategories, search]);

  const filteredUncategorized = useMemo(() => {
    if (!search.trim()) return uncategorizedProfessions;
    const q = search.toLowerCase();
    return uncategorizedProfessions.filter((p) => p.toLowerCase().includes(q));
  }, [uncategorizedProfessions, search]);

  const professionalsForProfession = useMemo(() => {
    return profiles.filter((p) => p.profession === selectedProfession);
  }, [profiles, selectedProfession]);

  function selectProfession(profession: string) {
    setSelectedProfession(profession);
    setScreen('professionals');
  }

  function selectProfile(profile: ProfileWithServices) {
    setSelectedProfile(profile);
    setScreen('profile');
  }

  function goBack() {
    if (screen === 'profile') {
      setSelectedProfile(null);
      setScreen('professionals');
    } else if (screen === 'professionals') {
      setSelectedProfession('');
      setScreen('directory');
    }
  }

  function openBooking(service: Service) {
    setSelectedService(service);
    setClientName(user?.name || '');
    setClientEmail(user?.email || '');
    setClientPhone('');
    setSelectedDate('');
    setSelectedTime('');
    setBookingModal(true);
  }

  async function createBooking() {
    if (!selectedDate || !selectedTime || !clientName || !clientEmail || !selectedService || !selectedProfile) {
      Alert.alert('Error', 'Completa todos los campos y selecciona fecha/hora');
      return;
    }
    setBookingLoading(true);
    try {
      await api.post('/api/bookings', {
        profileId: selectedProfile.id,
        serviceId: selectedService.id,
        clientName,
        clientEmail: clientEmail.trim().toLowerCase(),
        clientPhone: clientPhone || undefined,
        date: selectedDate,
        startTime: selectedTime,
      });
      Alert.alert('Reserva creada', 'Tu reserva ha sido creada exitosamente');
      setBookingModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo crear la reserva');
    } finally {
      setBookingLoading(false);
    }
  }

  // Profile detail screen
  if (screen === 'profile' && selectedProfile) {
    const activeServices = (selectedProfile.services || []).filter((s) => s.isActive);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack}>
            <Text style={styles.backBtn}>← Volver</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={activeServices}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <Card style={styles.profileDetail}>
              {selectedProfile.avatar ? (
                <Image source={{ uri: selectedProfile.avatar }} style={styles.profileAvatarImage} />
              ) : (
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {(selectedProfile.title || selectedProfile.slug).charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.profileDetailName}>{selectedProfile.title || selectedProfile.slug}</Text>
              {selectedProfile.profession && (
                <Text style={styles.profileDetailProfession}>{selectedProfile.profession}</Text>
              )}
              {selectedProfile.bio && (
                <Text style={styles.profileDetailBio}>{selectedProfile.bio}</Text>
              )}
              <Text style={styles.servicesCount}>
                {activeServices.length} servicio{activeServices.length !== 1 ? 's' : ''} disponible{activeServices.length !== 1 ? 's' : ''}
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <ServiceCard service={item} onBook={() => openBooking(item)} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No hay servicios disponibles</Text>
          }
        />

        <Modal visible={bookingModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Reservar: {selectedService?.name}</Text>
                <Input label="Nombre" value={clientName} onChangeText={setClientName} placeholder="Tu nombre" />
                <Input
                  label="Email"
                  value={clientEmail}
                  onChangeText={setClientEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="tu@email.com"
                />
                <Input
                  label="Teléfono (opcional)"
                  value={clientPhone}
                  onChangeText={setClientPhone}
                  keyboardType="phone-pad"
                />
                {selectedProfile && selectedService && (
                  <SlotPicker
                    profileId={selectedProfile.id}
                    serviceId={selectedService.id}
                    onSelect={(date, time) => {
                      setSelectedDate(date);
                      setSelectedTime(time);
                    }}
                  />
                )}
                <View style={styles.modalActions}>
                  <Button
                    title="Confirmar reserva"
                    onPress={createBooking}
                    loading={bookingLoading}
                    disabled={!selectedDate || !selectedTime}
                    size="lg"
                  />
                  <Button
                    title="Cancelar"
                    onPress={() => setBookingModal(false)}
                    variant="ghost"
                    style={{ marginTop: spacing.sm }}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Professionals list screen
  if (screen === 'professionals') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack}>
            <Text style={styles.backBtn}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{selectedProfession}</Text>
          <Text style={styles.subtitle}>
            {professionalsForProfession.length} profesional{professionalsForProfession.length !== 1 ? 'es' : ''}
          </Text>
        </View>

        <FlatList
          data={professionalsForProfession}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const activeCount = (item.services || []).filter((s) => s.isActive).length;
            return (
              <TouchableOpacity onPress={() => selectProfile(item)} activeOpacity={0.7}>
                <Card style={styles.proCard}>
                  <View style={styles.proRow}>
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={styles.proAvatarImage} />
                    ) : (
                      <View style={styles.proAvatar}>
                        <Text style={styles.proAvatarText}>
                          {(item.title || item.slug).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.proInfo}>
                      <Text style={styles.proName}>{item.title || item.slug}</Text>
                      {item.bio ? (
                        <Text style={styles.proBio} numberOfLines={2}>{item.bio}</Text>
                      ) : null}
                      <Text style={styles.proServices}>
                        {activeCount} servicio{activeCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text style={styles.proArrow}>›</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No hay profesionales en esta categoría</Text>
          }
        />
      </SafeAreaView>
    );
  }

  // Directory screen
  const directoryData: { type: 'category' | 'profession' | 'uncategorized'; label: string; count?: number }[] = [];
  filteredCategories.forEach((cat) => {
    directoryData.push({ type: 'category', label: cat.category });
    cat.professions.forEach((p) => {
      const count = profiles.filter((pr) => pr.profession === p).length;
      directoryData.push({ type: 'profession', label: p, count });
    });
  });
  if (filteredUncategorized.length > 0) {
    directoryData.push({ type: 'category', label: 'Otros' });
    filteredUncategorized.forEach((p) => {
      const count = profiles.filter((pr) => pr.profession === p).length;
      directoryData.push({ type: 'uncategorized', label: p, count });
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explorar</Text>
        <Text style={styles.subtitle}>Encuentra el profesional que necesitás</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar profesión..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={directoryData}
        keyExtractor={(item, index) => item.label + index}
        renderItem={({ item }) => {
          if (item.type === 'category') {
            return (
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryText}>{item.label}</Text>
              </View>
            );
          }
          return (
            <TouchableOpacity onPress={() => selectProfession(item.label)} activeOpacity={0.7}>
              <View style={styles.professionRow}>
                <Text style={styles.professionText}>{item.label}</Text>
                <View style={styles.professionRight}>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{item.count}</Text>
                  </View>
                  <Text style={styles.proArrow}>›</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.directoryList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchProfiles();
              setRefreshing(false);
            }}
            tintColor={colors.amber}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Cargando...' : search ? 'No se encontraron resultados' : 'No hay profesionales registrados'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}
