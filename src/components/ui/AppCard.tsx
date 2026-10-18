import { View, StyleSheet, useColorScheme, type ViewProps } from 'react-native';
import { colors, darkColors, radius, spacing } from '@/theme/tokens';

export function AppCard({ style, children, ...props }: ViewProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View
      {...props}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? darkColors.surface : colors.surface,
          borderColor: isDark ? darkColors.border : colors.border,
          shadowColor: '#64748B',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
    >
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
