import { View, StyleSheet, type ViewProps } from 'react-native';
import { useColorScheme } from '@/theme/ThemeProvider';
import { darkColors, radius, spacing, useThemeColors } from '@/theme/tokens';

export function AppCard({ style, children, ...props }: ViewProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
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

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
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
