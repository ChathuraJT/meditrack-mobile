import { useRef, useState, useEffect, type PropsWithChildren } from 'react';
import { Pressable, View, StyleSheet, type TextInputProps } from 'react-native';
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppInput } from '@/components/ui/AppInput';
import { AppCard } from '@/components/ui/AppCard';
import { colors, spacing } from '@/theme/tokens';
import { useAuth } from './AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';

export function AuthScreen({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  const { available } = useAuth();
  return (
    <Screen>
      <View style={styles.brand}>
        <Ionicons
          name="medical-outline"
          size={30}
          color={colors.primary}
          accessible={false}
        />
        <AppText variant="heading" style={{ color: colors.primary }}>
          MediTrack
        </AppText>
      </View>
      <View style={styles.stack}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        <AppText muted>{description}</AppText>
      </View>
      {!available && (
        <AppCard>
          <AppText accessibilityRole="alert">
            Authentication is unavailable because the MediTrack API URL is not
            configured. You can preview these forms, but cannot submit them.
          </AppText>
        </AppCard>
      )}
      {children}
    </Screen>
  );
}
export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  password = false,
  ...props
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  password?: boolean;
} & TextInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value, ref },
        fieldState: { error },
      }) => (
        <View style={styles.stack}>
          <AppInput
            {...props}
            ref={ref}
            label={label}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={error?.message}
            secureTextEntry={password && !visible}
            autoCapitalize={props.autoCapitalize ?? 'none'}
            autoCorrect={false}
          />
          {password && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
              accessibilityState={{ expanded: visible }}
              onPress={() => setVisible(!visible)}
              style={styles.visibility}
            >
              <Ionicons
                name={visible ? 'eye-off-outline' : 'eye-outline'}
                color={colors.primary}
                size={20}
              />
              <AppText variant="caption" style={{ color: colors.primary }}>
                {visible ? 'Hide password' : 'Show password'}
              </AppText>
            </Pressable>
          )}
        </View>
      )}
    />
  );
}
export function Feedback({ message }: { message: string }) {
  const { colors } = useTheme();
  return message ? (
    <AppText
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ color: colors.error }}
    >
      {message}
    </AppText>
  ) : null;
}
export function TextAction({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={styles.action}
    >
      <AppText style={{ color: colors.primary, textAlign: 'center' }}>
        {label}
      </AppText>
    </Pressable>
  );
}
// Prevent multiple in-flight requests even before React has rendered a busy state.
export function useSubmission() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  async function run(operation: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await operation();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { busy, run };
}
export function useCooldown(sentAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [sentAt]);
  return Math.max(0, Math.min(60, Math.ceil((sentAt + 60000 - now) / 1000)));
}
export const formStyles = StyleSheet.create({ stack: { gap: spacing.md } });
const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  stack: { gap: spacing.sm },
  visibility: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
  action: { minHeight: 48, padding: spacing.sm, justifyContent: 'center' },
});
