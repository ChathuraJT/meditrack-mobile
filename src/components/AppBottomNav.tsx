import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme/tokens';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const destinations = [
  { href: '/', label: 'Home', icon: 'home-outline' },
  { href: '/medications', label: 'Medications', icon: 'medical-outline' },
  { href: '/recovery', label: 'Recovery', icon: 'heart-outline' },
  { href: '/map', label: 'Map', icon: 'map-outline' },
] as const;

export function AppBottomNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  return (
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
      {destinations.map(({ href, label, icon }) => {
        const selected =
          pathname === href || (href === '/' && pathname === '/channel-doctor');
        return (
          <Pressable
            key={href}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => router.navigate(href)}
            style={({ pressed }) => [
              styles.button,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={icon}
              size={23}
              color={selected ? colors.primary : colors.secondary}
            />
            <AppText
              variant="caption"
              style={[
                styles.label,
                { color: selected ? colors.primary : colors.secondary },
              ]}
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
  label: { textAlign: 'center', fontSize: 12 },
  selected: { backgroundColor: colors.background },
  pressed: { opacity: 0.6 },
});
