import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, radius, spacing } from '@/theme/tokens';
import { RegionalRadarCard } from './RegionalRadarCard';

export function HomeScreen() {
  const { session } = useAuth();
  const username = session?.user.username || 'Patient';

  return (
    <Screen>
      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
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
        <View style={styles.profileFooter}>
          <View style={styles.patientBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={colors.primary}
            />
            <AppText variant="caption" style={styles.badgeText}>
              Patient portal
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/profile')}
            style={styles.profileLink}
          >
            <AppText variant="caption" style={styles.linkText}>
              View profile
            </AppText>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionIntro}>
        <AppText variant="heading" style={styles.heading}>
          How can we help today?
        </AppText>
        <AppText style={styles.secondary}>
          Your care, one step at a time.
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Channel a Doctor. Find doctors, book an appointment and view your live clinic queue."
        onPress={() => router.push('/channel-doctor')}
        style={({ pressed }) => [styles.channelCard, pressed && styles.pressed]}
      >
        <View style={styles.channelIcon}>
          <Ionicons name="medkit-outline" size={28} color="#FFFFFF" />
        </View>
        <AppText variant="heading" style={styles.channelTitle}>
          Channel a Doctor
        </AppText>
        <AppText style={styles.channelDescription}>
          Find the right doctor and keep track of your clinic visit.
        </AppText>
        <View style={styles.channelFooter}>
          <AppText style={styles.channelAction}>
            Find doctors & view queue
          </AppText>
          <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.navigate('/medications')}
        style={({ pressed }) => [
          styles.medicationCard,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.smallIcon}>
          <Ionicons name="medical-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.profileCopy}>
          <AppText style={styles.actionTitle}>Daily medications</AppText>
          <AppText variant="caption" style={styles.secondary}>
            View your schedule and track doses
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </Pressable>
      <RegionalRadarCard />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F4FE',
  },
  initial: { fontSize: 26, fontWeight: '700', color: colors.primary },
  profileCopy: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 1.2,
    color: colors.secondary,
    fontWeight: '700',
  },
  name: { color: colors.text, flexShrink: 1 },
  profileMeta: { color: colors.secondary },
  profileFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  patientBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeText: { color: colors.primary, fontWeight: '600' },
  profileLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: { color: colors.primary, fontWeight: '600' },
  sectionIntro: { gap: spacing.xs, marginTop: spacing.sm },
  heading: { color: colors.text, fontSize: 22, textAlign: 'center' },
  secondary: { color: colors.secondary, textAlign: 'center' },
  channelCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  channelIcon: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  channelTitle: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
  channelDescription: {
    color: '#E6F4FE',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  channelFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.24)',
  },
  channelAction: { color: '#FFFFFF', flex: 1, fontSize: 14, fontWeight: '700' },
  medicationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 88,
  },
  smallIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { color: colors.text, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
