import { createThemedStyles, useThemedStyles } from '@/theme/ThemeProvider';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { radius, spacing } from '@/theme/tokens';
export function AppCard({ style, ...props }: ViewProps) {
  const styles = useThemedStyles(themedStyles);
  return <View {...props} style={[styles.card, style]} />;
}
const themedStyles = createThemedStyles((colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.md,
    },
  }),
);
