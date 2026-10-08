import { View, StyleSheet, useColorScheme, type ViewProps } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { MedicalPatternBackground } from '@/components/MedicalPatternBackground';

export function AppCard({ style, children, ...props }: ViewProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View
      {...props}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#0C3154' : colors.surface,
          borderColor: isDark ? '#1C4A75' : colors.border,
        },
        style,
      ]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <MedicalPatternBackground
          density="balanced"
          opacity={isDark ? 0.16 : 0.2}
          backgroundColor="transparent"
          style={StyleSheet.absoluteFill}
        />
      </View>
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
