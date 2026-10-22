import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { spacing, useThemeColors } from '@/theme/tokens';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Pressable, StyleSheet, View, type TextInputProps } from 'react-native';
import { useColorScheme } from '@/theme/ThemeProvider';
import { useAuth } from './AuthProvider';

export function AuthScreen({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { available } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const brandColor = isDark ? '#38BDF8' : colors.primary;

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.brand}>
        <Ionicons
          name="medical-outline"
          size={32}
          color={brandColor}
          accessible={false}
        />
        <AppText
          variant="heading"
          style={{ color: brandColor, fontWeight: '700' }}
        >
          MediTrack
        </AppText>
      </View>
      <View style={styles.headerStack}>
        <AppText
          variant="title"
          accessibilityRole="header"
          style={[
            styles.centerText,
            { color: isDark ? '#FFFFFF' : colors.text },
          ]}
        >
          {title}
        </AppText>
        <AppText
          muted
          style={[
            styles.centerText,
            { color: isDark ? '#94A3B8' : colors.secondary },
          ]}
        >
          {description}
        </AppText>
      </View>

      {!available && (
        <AppCard>
          <AppText accessibilityRole="alert" style={styles.centerText}>
            Authentication is unavailable because the backend address is not
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
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [visible, setVisible] = useState(false);
  const isDark = useColorScheme() === 'dark';
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
                    color={isDark ? '#38BDF8' : colors.primary}
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
  const colors = useThemeColors();
  const isDark = useColorScheme() === 'dark';
  return message ? (
    <AppText
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ color: isDark ? '#FCA5A5' : colors.error, fontWeight: '500' }}
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
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const isDark = useColorScheme() === 'dark';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={styles.action}
    >
      <AppText
        style={{
          color: isDark ? '#38BDF8' : colors.primary,
          textAlign: 'center',
          fontWeight: '600',
        }}
      >
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
const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
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
