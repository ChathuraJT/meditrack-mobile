import { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useColorScheme } from '@/theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/features/auth/AuthProvider';
import { spacing, radius, useThemeColors } from '@/theme/tokens';

export function AppHeader() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const showBack = [
    '/profile',
    '/consent-settings',
    '/email-link',
    '/tracking',
    '/location-history',
    '/exposure-analysis',
    '/nearby-devices',
    '/nearby-devices',
  ].includes(pathname);
  const { session, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const username = session?.user?.username || 'User';

  async function handleSignOut() {
    setMenuOpen(false);
    try {
      await signOut();
    } catch (e) {
      console.warn('Sign out failed:', e);
    }
  }

  function handleProfileClick() {
    setMenuOpen(false);
    router.navigate('/profile');
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, spacing.sm),
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.content}>
        {showBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/')
            }
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
        )}
        {/* Logo and Brand */}
        <Pressable
          style={styles.brand}
          onPress={() => router.navigate('/')}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
        >
          <View
            style={[
              styles.logoBadge,
              { backgroundColor: isDark ? '#133E68' : '#E6F4FE' },
            ]}
          >
            <Ionicons
              name="medical"
              size={24}
              color={colors.primary}
              accessible={false}
            />
          </View>
          <View>
            <AppText
              variant="heading"
              style={[styles.brandTitle, { color: colors.text }]}
            >
              MediTrack
            </AppText>
            <AppText
              variant="caption"
              style={[styles.brandSubtitle, { color: colors.secondary }]}
            >
              Care Companion
            </AppText>
          </View>
        </Pressable>

        {/* Profile Avatar Trigger */}
        <ThemeToggle />
        <Pressable
          style={({ pressed }) => [
            styles.profileButton,
            { borderColor: isDark ? '#2A527A' : colors.border },
            pressed && styles.pressed,
          ]}
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open user profile menu"
        >
          <Ionicons
            name="person"
            size={22}
            color={colors.primary}
            accessible={false}
          />
        </Pressable>
      </View>

      {/* Profile Popup Modal */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.dropdownMenu,
                  {
                    top: Math.max(insets.top, spacing.sm) + 62,
                    backgroundColor: isDark ? '#0C3154' : colors.surface,
                    borderColor: isDark ? '#1C4A75' : colors.border,
                  },
                ]}
              >
                <View style={styles.menuHeader}>
                  <View style={styles.menuAvatar}>
                    <Ionicons name="person" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.userInfo}>
                    <AppText
                      style={[
                        styles.usernameText,
                        { color: isDark ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {username}
                    </AppText>
                    <AppText
                      variant="caption"
                      style={{ color: isDark ? '#86CFE0' : colors.secondary }}
                    >
                      {session?.user?.role || 'Patient'}
                    </AppText>
                  </View>
                </View>

                <View
                  style={[
                    styles.divider,
                    { backgroundColor: isDark ? '#1C4A75' : colors.border },
                  ]}
                />

                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed &&
                      (isDark
                        ? styles.menuItemPressedDark
                        : styles.menuItemPressed),
                  ]}
                  onPress={handleProfileClick}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={isDark ? '#E6F4FE' : colors.text}
                  />
                  <AppText
                    style={[
                      styles.menuItemLabel,
                      { color: isDark ? '#E6F4FE' : colors.text },
                    ]}
                  >
                    View Profile
                  </AppText>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed &&
                      (isDark
                        ? styles.menuItemPressedDark
                        : styles.menuItemPressed),
                  ]}
                  onPress={handleSignOut}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="log-out-outline"
                    size={20}
                    color={colors.error}
                  />
                  <AppText
                    style={[styles.menuItemLabel, { color: colors.error }]}
                  >
                    Sign Out
                  </AppText>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    backButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    container: {
      borderBottomWidth: 1,
      zIndex: 100,
      overflow: 'hidden',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 58,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    brand: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    logoBadge: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandTitle: {
      fontSize: 21,
      fontWeight: '700',
      lineHeight: 26,
    },
    brandSubtitle: {
      textAlign: 'center',
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500',
    },
    profileButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    pressed: {
      opacity: 0.6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
    },
    dropdownMenu: {
      position: 'absolute',
      right: spacing.md,
      width: 220,
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 8,
    },
    menuHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.xs,
    },
    menuAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userInfo: {
      flex: 1,
    },
    usernameText: {
      fontWeight: '600',
      fontSize: 15,
    },
    divider: {
      height: 1,
      marginVertical: spacing.xs,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.sm,
    },
    menuItemPressed: {
      backgroundColor: colors.background,
    },
    menuItemPressedDark: {
      backgroundColor: '#133E68',
    },
    menuItemLabel: {
      fontSize: 14,
      fontWeight: '500',
    },
  });
