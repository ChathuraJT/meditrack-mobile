import { useState } from 'react';
import { Modal, Pressable, View, FlatList, StyleSheet } from 'react-native';
import { useColorScheme } from '@/theme/ThemeProvider';
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
import { radius, spacing, useThemeColors } from '@/theme/tokens';
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
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const isDark = useColorScheme() === 'dark';

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={{ gap: spacing.xs }}>
          <AppText
            style={{
              color: isDark ? '#E2E8F0' : colors.text,
              fontWeight: '600',
              fontSize: 14,
            }}
          >
            {label}
          </AppText>
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
            style={[
              styles.select,
              {
                borderColor: fieldState.error
                  ? colors.error
                  : isDark
                    ? '#2D557C'
                    : colors.border,
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : colors.surface,
              },
            ]}
          >
            <AppText
              style={{ flex: 1, color: isDark ? '#FFFFFF' : colors.text }}
            >
              {options.find((o) => o.value === field.value)?.label ??
                'Select an option'}
            </AppText>
            <Ionicons
              name="chevron-down-outline"
              size={20}
              color={isDark ? '#7E9BB8' : colors.secondary}
            />
          </Pressable>
          {fieldState.error && (
            <AppText
              style={{ color: isDark ? '#FCA5A5' : colors.error, fontSize: 13 }}
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
            <SafeAreaView
              style={[
                styles.modal,
                { backgroundColor: isDark ? '#082B50' : colors.background },
              ]}
            >
              <AppText
                variant="heading"
                accessibilityRole="header"
                style={{ color: isDark ? '#FFFFFF' : colors.text }}
              >
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
                    style={[
                      styles.option,
                      { borderColor: isDark ? '#1C4A75' : colors.border },
                    ]}
                    onPress={() => {
                      field.onChange(item.value);
                      field.onBlur();
                      setOpen(false);
                    }}
                  >
                    <AppText
                      style={{ color: isDark ? '#FFFFFF' : colors.text }}
                    >
                      {item.label}
                    </AppText>
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

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    select: {
      minHeight: 50,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1.5,
      borderRadius: radius.sm,
    },
    modal: {
      flex: 1,
      padding: spacing.lg,
      gap: spacing.md,
    },
    option: {
      padding: spacing.md,
      minHeight: 52,
      borderBottomWidth: 1,
    },
  });
