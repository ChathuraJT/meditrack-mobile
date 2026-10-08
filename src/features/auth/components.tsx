import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/theme/tokens';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Pressable, StyleSheet, View, type TextInputProps } from 'react-native';
import { useAuth } from './AuthProvider';

export function AuthScreen({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  const { available } = useAuth();
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.brand}>
        <Ionicons
          name="medical-outline"
          size={32}
          color={colors.primary}
          accessible={false}
        />
        <AppText variant="heading" style={{ color: colors.primary, fontWeight: '700' }}>
          MediTrack
        </AppText>
      </View>
      <View style={styles.headerStack}>
        <AppText variant="title" accessibilityRole="header" style={styles.centerText}>
          {title}
        </AppText>
        <AppText muted style={styles.centerText}>
          {description}
        </AppText>
      </View>
      {!available && (
        <AppCard>
          <AppText accessibilityRole="alert" style={styles.centerText}>
            Authentication is unavailable because Supabase is not configured.
            You can preview these forms, but cannot submit them.
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
            rightAccessory={
              password ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                  accessibilityState={{ expanded: visible }}
                  onPress={() => setVisible(!visible)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={visible ? 'eye-off-outline' : 'eye-outline'}
                    color={colors.primary}
                    size={22}
                  />
                </Pressable>
              ) : undefined
            }
          />
        </View>
      )}
    />
  );
}
export function Feedback({ message }: { message: string }) {
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
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  headerStack: {
    gap: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
  stack: { gap: spacing.sm },
  eyeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  action: { minHeight: 48, padding: spacing.sm, justifyContent: 'center' },
});
