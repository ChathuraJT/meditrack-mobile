import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme/tokens';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  TabList,
  Tabs,
  TabSlot,
  TabTrigger,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { MedicalPatternBackground } from '@/components/MedicalPatternBackground';

type ButtonProps = TabTriggerSlotProps & {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
};
function TabButton({ icon, label, isFocused, ...props }: ButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [
        styles.button,
        isFocused && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={23}
        color={isFocused ? colors.primary : colors.secondary}
        accessible={false}
      />
      <AppText
        variant="caption"
        style={{ color: isFocused ? colors.primary : colors.secondary }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
export function AppTabs() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={styles.container}>
      <AppHeader />
      <Tabs style={styles.tabs}>
        <TabSlot style={styles.slot} />
        <TabList
          style={StyleSheet.flatten([
            styles.list,
            {
              paddingBottom: Math.max(insets.bottom, spacing.sm),
              paddingLeft: Math.max(insets.left, spacing.xs),
              paddingRight: Math.max(insets.right, spacing.xs),
              backgroundColor: isDark ? '#0A2540' : colors.surface,
              borderColor: isDark ? '#1A3B5C' : colors.border,
            },
          ])}
        >
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <MedicalPatternBackground
              density="sparse"
              opacity={isDark ? 0.16 : 0.2}
              backgroundColor="transparent"
              style={StyleSheet.absoluteFill}
            />
          </View>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon="home-outline" label="Home" />
          </TabTrigger>
          <TabTrigger name="medications" href="/medications" asChild>
            <TabButton icon="medical-outline" label="Medications" />
          </TabTrigger>
          <TabTrigger name="recovery" href="/recovery" asChild>
            <TabButton icon="heart-outline" label="Recovery" />
          </TabTrigger>
          <TabTrigger name="map" href="/map" asChild>
            <TabButton icon="map-outline" label="Map" />
          </TabTrigger>
        </TabList>
      </Tabs>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: { flex: 1, backgroundColor: colors.background },
  slot: { flex: 1 },
  list: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.sm,
    overflow: 'hidden',
  },
  button: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    gap: spacing.xs,
    borderRadius: 10,
  },
  selected: { backgroundColor: colors.background },
  pressed: { opacity: 0.6 },
});
