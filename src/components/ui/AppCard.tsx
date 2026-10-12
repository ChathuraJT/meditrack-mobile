import { View, StyleSheet, useColorScheme, type ViewProps } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { MedicalPatternBackground } from '@/components/MedicalPatternBackground';

export function AppCard({ style, children, ...props }: ViewProps) {
  return (
    <View
      {...props}
      style={[
        styles.card,
        {
          backgroundColor: '#FFFFFF',
          borderColor: '#E2E8F0',
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
