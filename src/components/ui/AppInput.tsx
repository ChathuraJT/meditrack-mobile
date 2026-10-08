import { useId, type Ref } from 'react';
import { View, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { AppText } from './AppText';
import { colors, radius, spacing } from '@/theme/tokens';
type Props = TextInputProps & {
  label: string;
  error?: string;
  ref?: Ref<TextInput>;
  rightAccessory?: React.ReactNode;
};
export function AppInput({ label, error, style, rightAccessory, ...props }: Props) {
  const id = useId();
  return (
    <View style={styles.container}>
      <AppText nativeID={id}>{label}</AppText>
      <View style={[styles.inputWrapper, error ? styles.invalid : undefined]}>
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          accessibilityHint={error ?? props.accessibilityHint}
          accessibilityLabelledBy={id}
          placeholderTextColor={colors.secondary}
          style={[styles.input, style]}
        />
        {rightAccessory && (
          <View style={styles.accessory}>{rightAccessory}</View>
        )}
      </View>
      {error && (
        <AppText accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </AppText>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  inputWrapper: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'transparent',
    color: colors.text,
    fontSize: 16,
  },
  accessory: {
    paddingRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invalid: { borderColor: colors.error },
  error: { color: colors.error },
});
