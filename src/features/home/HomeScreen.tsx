import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, darkColors, radius, spacing } from '@/theme/tokens';

export function HomeScreen() {
  const { session } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const username = session?.user.username || 'Patient';
  const theme = isDark ? darkColors : colors;

  return (
    <Screen withPattern>
      {/* Patient Profile Companion Card */}
      <View
        style={[
          styles.profileCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.profileTop}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: isDark
                  ? 'rgba(56, 189, 248, 0.15)'
                  : '#E6F4FE',
              },
            ]}
          >
            <AppText style={styles.initial}>
              {username.charAt(0).toUpperCase()}
            </AppText>
          </View>
          <View style={styles.profileCopy}>
            <AppText style={styles.eyebrow}>YOUR CARE COMPANION</AppText>
            <AppText variant="heading" style={styles.name}>
              {username}
            </AppText>
            <AppText variant="caption" style={styles.profileMeta}>
              Patient {session?.user.id ? `• ID ${session.user.id}` : ''}
            </AppText>
          </View>
        </View>
        <View
          style={[
            styles.profileFooter,
            { borderTopColor: theme.border },
          ]}
        >
          <View style={styles.patientBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={theme.primary}
            />
            <AppText
              variant="caption"
              style={[styles.badgeText, { color: theme.primary }]}
            >
              Patient portal
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/profile')}
            style={styles.profileLink}
          >
            <AppText
              variant="caption"
              style={[styles.linkText, { color: theme.primary }]}
            >
              View profile
            </AppText>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.primary}
            />
          </Pressable>
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <AppText variant="heading" style={styles.sectionTitle}>
          Dashboard Services
        </AppText>
        <AppText variant="caption" muted>
          Select a service to manage your health journey
        </AppText>
      </View>

      {/* 2x2 Square Cards Grid */}
      <View style={styles.grid}>
        {/* Row 1: Channel Doctor & Daily Medication */}
        <View style={styles.gridRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Channel Doctor. Find doctors, book an appointment, and view your live clinic queue."
            onPress={() => router.push('/channel-doctor')}
            style={({ pressed }) => [
              styles.squareCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.cardTopRow}>
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(56, 189, 248, 0.15)'
                      : '#E6F4FE',
                  },
                ]}
              >
                <Ionicons
                  name="medkit-outline"
                  size={26}
                  color={isDark ? '#38BDF8' : colors.primary}
                />
              </View>
              <Ionicons
                name="arrow-forward-circle-outline"
                size={20}
                color={isDark ? '#94A3B8' : '#94A3B8'}
              />
            </View>
            <View style={styles.cardBottom}>
              <AppText style={styles.cardTitle}>Channel Doctor</AppText>
              <AppText
                variant="caption"
                muted
                numberOfLines={2}
                style={styles.cardSubtitle}
              >
                Find doctors & appointments
              </AppText>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Daily Medication. View schedule and track doses."
            onPress={() => router.navigate('/medications')}
            style={({ pressed }) => [
              styles.squareCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.cardTopRow}>
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(251, 191, 36, 0.15)'
                      : '#FEF3C7',
                  },
                ]}
              >
                <Ionicons
                  name="medical-outline"
                  size={26}
                  color={isDark ? '#FBBF24' : '#D97706'}
                />
              </View>
              <Ionicons
                name="arrow-forward-circle-outline"
                size={20}
                color={isDark ? '#94A3B8' : '#94A3B8'}
              />
            </View>
            <View style={styles.cardBottom}>
              <AppText style={styles.cardTitle}>Daily Medication</AppText>
              <AppText
                variant="caption"
                muted
                numberOfLines={2}
                style={styles.cardSubtitle}
              >
                Track schedules & doses
              </AppText>
            </View>
          </Pressable>
        </View>

        {/* Row 2: Recovery & Map */}
        <View style={styles.gridRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recovery. Care plan, activities, and recovery milestones."
            onPress={() => router.navigate('/recovery')}
            style={({ pressed }) => [
              styles.squareCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.cardTopRow}>
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(52, 211, 153, 0.15)'
                      : '#D1FAE5',
                  },
                ]}
              >
                <Ionicons
                  name="pulse-outline"
                  size={26}
                  color={isDark ? '#34D399' : '#059669'}
                />
              </View>
              <Ionicons
                name="arrow-forward-circle-outline"
                size={20}
                color={isDark ? '#94A3B8' : '#94A3B8'}
              />
            </View>
            <View style={styles.cardBottom}>
              <AppText style={styles.cardTitle}>Recovery</AppText>
              <AppText
                variant="caption"
                muted
                numberOfLines={2}
                style={styles.cardSubtitle}
              >
                Care plan & milestones
              </AppText>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Map. Interactive health locator and nearby medical centers."
            onPress={() => router.navigate('/map')}
            style={({ pressed }) => [
              styles.squareCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.cardTopRow}>
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(167, 139, 250, 0.15)'
                      : '#EDE9FE',
                  },
                ]}
              >
                <Ionicons
                  name="map-outline"
                  size={26}
                  color={isDark ? '#A78BFA' : '#7C3AED'}
                />
              </View>
              <Ionicons
                name="arrow-forward-circle-outline"
                size={20}
                color={isDark ? '#94A3B8' : '#94A3B8'}
              />
            </View>
            <View style={styles.cardBottom}>
              <AppText style={styles.cardTitle}>Map</AppText>
              <AppText
                variant="caption"
                muted
                numberOfLines={2}
                style={styles.cardSubtitle}
              >
                Nearby medical centers
              </AppText>
            </View>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: 24, fontWeight: '700', color: colors.primary },
  profileCopy: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 1.2,
    color: colors.secondary,
    fontWeight: '700',
  },
  name: { flexShrink: 1 },
  profileMeta: { color: colors.secondary },
  profileFooter: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  patientBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeText: { fontWeight: '600' },
  profileLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: { fontWeight: '600' },
  sectionHeader: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  grid: {
    gap: spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  squareCard: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottom: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  cardSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
