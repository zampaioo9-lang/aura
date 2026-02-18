import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SectionList,
  TextInput,
} from 'react-native';
import { fontSize, spacing, borderRadius } from '../lib/theme';
import { useThemeColors } from '../lib/ThemeContext';
import { PROFESSION_CATEGORIES } from '../lib/professions';

interface ProfessionPickerProps {
  value: string;
  onSelect: (profession: string) => void;
}

export default function ProfessionPicker({ value, onSelect }: ProfessionPickerProps) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
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
    selector: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md - 2,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    selectorText: {
      color: colors.text,
      fontSize: fontSize.md,
      flex: 1,
    },
    placeholder: {
      color: colors.textMuted,
    },
    arrow: {
      color: colors.textMuted,
      fontSize: 10,
      marginLeft: spacing.sm,
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
      maxHeight: '85%',
      paddingBottom: spacing.xl,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
    },
    modalTitle: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: colors.text,
    },
    closeBtn: {
      color: colors.amber,
      fontSize: fontSize.md,
      fontWeight: '600',
    },
    searchInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      fontSize: fontSize.md,
      color: colors.text,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
    },
    sectionHeader: {
      backgroundColor: colors.surfaceLight,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      fontSize: fontSize.sm,
      fontWeight: '700',
      color: colors.amber,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    option: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md - 2,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    optionActive: {
      backgroundColor: colors.amberSubtle,
    },
    optionText: {
      color: colors.text,
      fontSize: fontSize.md,
    },
    optionTextActive: {
      color: colors.amber,
      fontWeight: '600',
    },
    check: {
      color: colors.amber,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    empty: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.xl,
      fontSize: fontSize.md,
    },
  }), [colors]);

  const filtered = search.trim()
    ? PROFESSION_CATEGORIES.map((cat) => ({
        ...cat,
        professions: cat.professions.filter((p) =>
          p.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((cat) => cat.professions.length > 0)
    : PROFESSION_CATEGORIES;

  const sections = filtered.map((cat) => ({
    title: cat.category,
    data: cat.professions,
  }));

  function handleSelect(profession: string) {
    onSelect(profession);
    setVisible(false);
    setSearch('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Profesión</Text>
      <TouchableOpacity style={styles.selector} onPress={() => setVisible(true)}>
        <Text style={[styles.selectorText, !value && styles.placeholder]}>
          {value || 'Seleccionar profesión...'}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar profesión</Text>
              <TouchableOpacity onPress={() => { setVisible(false); setSearch(''); }}>
                <Text style={styles.closeBtn}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Buscar profesión..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />

            <SectionList
              sections={sections}
              keyExtractor={(item, index) => item + index}
              renderSectionHeader={({ section }) => (
                <Text style={styles.sectionHeader}>{section.title}</Text>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, value === item && styles.optionActive]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[styles.optionText, value === item && styles.optionTextActive]}>
                    {item}
                  </Text>
                  {value === item && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>No se encontraron profesiones</Text>
              }
              stickySectionHeadersEnabled
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
