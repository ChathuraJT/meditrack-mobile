import { useState } from 'react';
import { Modal, Pressable, View, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppText } from '@/components/ui/AppText';
import { AppInput } from '@/components/ui/AppInput';
import { colors, radius, spacing } from '@/theme/tokens';
import { TextAction } from './components';
export type Option = { value: string; label: string };
export const countryOptions: Option[] = getCountries()
  .map((code) => ({
    value: code,
    label: `${code === 'LK' ? 'Sri Lanka' : code} (+${getCountryCallingCode(code)})`,
  }))
  .sort((a, b) =>
    a.value === 'LK'
      ? -1
      : b.value === 'LK'
        ? 1
        : a.value.localeCompare(b.value),
  );
export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={{ gap: spacing.sm }}>
          <AppText>{label}</AppText>
          <Pressable
            ref={field.ref}
            onBlur={field.onBlur}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${options.find((o) => o.value === field.value)?.label ?? 'Select an option'}`}
            accessibilityHint={fieldState.error?.message}
            onPress={() => {
              setSearch('');
              setOpen(true);
            }}
            style={styles.select}
          >
            <AppText style={{ flex: 1 }}>
              {options.find((o) => o.value === field.value)?.label ??
                'Select an option'}
            </AppText>
            <Ionicons
              name="chevron-down-outline"
              size={20}
              color={colors.secondary}
            />
          </Pressable>
          {fieldState.error && (
            <AppText
              style={{ color: colors.error }}
              accessibilityLiveRegion="polite"
            >
              {fieldState.error.message}
            </AppText>
          )}
          <Modal
            visible={open}
            animationType="slide"
            onRequestClose={() => setOpen(false)}
          >
            <SafeAreaView style={styles.modal}>
              <AppText variant="heading" accessibilityRole="header">
                {label}
              </AppText>
              {options.length > 10 && (
                <AppInput
                  label="Search country code or calling code"
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="characters"
                />
              )}
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={options.filter((o) =>
                  o.label.toLowerCase().includes(search.toLowerCase()),
                )}
                keyExtractor={(o) => o.value}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: field.value === item.value }}
                    style={styles.option}
                    onPress={() => {
                      field.onChange(item.value);
                      field.onBlur();
                      setOpen(false);
                    }}
                  >
                    <AppText>{item.label}</AppText>
                  </Pressable>
                )}
              />
              <TextAction label="Cancel" onPress={() => setOpen(false)} />
            </SafeAreaView>
          </Modal>
        </View>
      )}
    />
  );
}
const styles = StyleSheet.create({
  select: {
    minHeight: 52,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
  },
  modal: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  option: {
    padding: spacing.md,
    minHeight: 52,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
});
