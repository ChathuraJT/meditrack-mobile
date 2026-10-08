import {
  createThemedStyles,
  useThemedStyles,
  useTheme,
} from '@/theme/ThemeProvider';
import { useId, type Ref } from 'react';
import { View, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { AppText } from './AppText';
import { radius, spacing } from '@/theme/tokens';
type Props = TextInputProps & {
  label: string;
  error?: string;
  ref?: Ref<TextInput>;
};
export function AppInput({ label, error, style, ...props }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const id = useId();
  return (
    <View style={styles.container}>
      <AppText nativeID={id}>{label}</AppText>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityHint={error ?? props.accessibilityHint}
        accessibilityLabelledBy={id}
        placeholderTextColor={colors.secondary}
        style={[styles.input, error ? styles.invalid : undefined, style]}
      />
      {error && (
        <AppText accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </AppText>
      )}
    </View>
  );
}
const themedStyles = createThemedStyles((colors) =>
  StyleSheet.create({
    container: { gap: spacing.sm },
    input: {
      minHeight: 48,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 16,
    },
    invalid: { borderColor: colors.error },
    error: { color: colors.error },
  }),
);
