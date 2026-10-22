import { useId, type Ref } from 'react';
import { View, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { useColorScheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';
import { radius, spacing, useThemeColors } from '@/theme/tokens';

type Props = TextInputProps & {
  label: string;
  error?: string;
  ref?: Ref<TextInput>;
  rightAccessory?: React.ReactNode;
};

export function AppInput({
  label,
  error,
  style,
  rightAccessory,
  ...props
}: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const id = useId();
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={styles.container}>
      <AppText
        nativeID={id}
        style={{
          color: isDark ? '#E2E8F0' : colors.text,
          fontWeight: '600',
          fontSize: 14,
        }}
      >
        {label}
      </AppText>
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: error
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
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          accessibilityHint={error ?? props.accessibilityHint}
          accessibilityLabelledBy={id}
          placeholderTextColor={isDark ? '#7E9BB8' : colors.secondary}
          style={[
            styles.input,
            { color: isDark ? '#FFFFFF' : colors.text },
            style,
          ]}
        />
        {rightAccessory && (
          <View style={styles.accessory}>{rightAccessory}</View>
        )}
      </View>
      {error && (
        <AppText
          accessibilityLiveRegion="polite"
          style={{ color: isDark ? '#FCA5A5' : colors.error, fontSize: 13 }}
        >
          {error}
        </AppText>
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { gap: spacing.xs },
    inputWrapper: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: radius.sm,
    },
    input: {
      flex: 1,
      minHeight: 48,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: 'transparent',
      fontSize: 16,
    },
    accessory: {
      paddingRight: spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
