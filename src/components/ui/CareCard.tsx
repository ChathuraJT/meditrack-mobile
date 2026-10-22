import { createContext, type PropsWithChildren } from 'react';
import {
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type ViewProps,
} from 'react-native';
import { radius, spacing } from '@/theme/tokens';
import { useCareCardColors, type CardTone } from '@/theme/careCard';

export const CareCardTextContext = createContext<{
  heading: string;
  supporting: string;
} | null>(null);
type CareCardProps = PropsWithChildren<
  ViewProps & {
    tone?: CardTone;
    contentStyle?: StyleProp<ViewStyle>;
  }
>;
const dots = Array.from({ length: 36 }, (_, index) => index);

export default function CareCard({
  children,
  tone = 'blue',
  style,
  contentStyle,
  ...props
}: CareCardProps) {
  const theme = useCareCardColors();
  const accent = theme.accents[tone];
  const borderRadius = StyleSheet.flatten(style)?.borderRadius ?? radius.md;
  return (
    <View
      {...props}
      style={[styles.shadow, { backgroundColor: theme.surface }, style]}
    >
      <View
        style={[
          styles.surface,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderRadius,
          },
        ]}
      >
        <View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}
        >
          <View style={[styles.accent, { backgroundColor: accent }]} />
          <View style={styles.dots}>
            {dots.map((index) => (
              <View key={index} style={styles.dotCell}>
                <View style={[styles.dot, { backgroundColor: accent }]} />
              </View>
            ))}
          </View>
        </View>
        <CareCardTextContext.Provider value={theme}>
          <View style={[styles.content, contentStyle]}>{children}</View>
        </CareCardTextContext.Provider>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.md,
    shadowColor: '#1D3051',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  surface: {
    flexGrow: 1,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
  },
  content: { padding: spacing.lg, gap: spacing.md },
  accent: {
    position: 'absolute',
    top: 24,
    bottom: 24,
    left: 0,
    width: 4,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    opacity: 0.75,
  },
  dots: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 60,
    flexDirection: 'row',
    flexWrap: 'wrap',
    opacity: 0.12,
  },
  dotCell: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 2, height: 2, borderRadius: 1 },
});
