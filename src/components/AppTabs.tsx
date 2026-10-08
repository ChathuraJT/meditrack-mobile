import {
  createThemedStyles,
  useThemedStyles,
  useTheme,
} from '@/theme/ThemeProvider';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ComponentProps } from 'react';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/theme/tokens';

type ButtonProps = TabTriggerSlotProps & {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
};
function TabButton({ icon, label, isFocused, ...props }: ButtonProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
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
  const styles = useThemedStyles(themedStyles);
  const insets = useSafeAreaInsets();
  return (
    <Tabs style={styles.tabs}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <View
          style={[
            styles.list,
            {
              paddingBottom: Math.max(insets.bottom, spacing.sm),
              paddingLeft: Math.max(insets.left, spacing.xs),
              paddingRight: Math.max(insets.right, spacing.xs),
            },
          ]}
        >
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon="home-outline" label="Home" />
          </TabTrigger>
          <TabTrigger name="medications" href="/medications" asChild>
            <TabButton icon="medical-outline" label="Medications" />
          </TabTrigger>
          <TabTrigger name="recovery" href="/recovery" asChild>
            <TabButton icon="heart-outline" label="Recovery" />
          </TabTrigger>
          <TabTrigger name="more" href="/more" asChild>
            <TabButton icon="grid-outline" label="More" />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}
const themedStyles = createThemedStyles((colors) =>
  StyleSheet.create({
    tabs: { flex: 1, backgroundColor: colors.background },
    slot: { flex: 1 },
    list: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingTop: spacing.sm,
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
  }),
);
