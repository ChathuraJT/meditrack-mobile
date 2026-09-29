import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
} from 'react-native';
import { AppText } from './AppText';
import { colors, radius, spacing } from '@/theme/tokens';
type Props = Omit<PressableProps, 'children'> & {
  label: string;
  loading?: boolean;
};
export function AppButton({
  label,
  loading = false,
  disabled,
  style,
  ...props
}: Props) {
  const unavailable = disabled || loading;
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!unavailable, busy: loading }}
      disabled={unavailable}
      style={(state) => [
        styles.button,
        (unavailable || state.pressed) && styles.dimmed,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {loading && <ActivityIndicator color={colors.surface} />}
      <AppText style={styles.label}>{label}</AppText>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.surface,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  dimmed: { opacity: 0.55 },
});
