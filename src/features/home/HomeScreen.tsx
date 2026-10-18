import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '@/components/ui/Screen';
import CareCard from '@/components/ui/CareCard';
import { useCareCardColors } from '@/theme/careCard';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, radius, spacing } from '@/theme/tokens';

export function HomeScreen() {
  const { session } = useAuth();
  const cardTheme = useCareCardColors();
  const styles = createStyles(cardTheme);
  const username = session?.user.username || 'Patient';

  return (
    <Screen withPattern>
      <CareCard
        tone="blue"
        style={{ borderRadius: radius.lg }}
        contentStyle={styles.profileCard}
      >
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
              color={cardTheme.accents.blue}
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
            <Ionicons
              name="chevron-forward"
              size={16}
              color={cardTheme.accents.blue}
            />
          </Pressable>
        </View>
      </CareCard>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Channel a Doctor. Find doctors, book an appointment and view your live clinic queue."
        onPress={() => router.push('/channel-doctor')}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <CareCard
          tone="blue"
          style={{ borderRadius: radius.lg }}
          contentStyle={styles.channelCard}
        >
          <View style={styles.channelIcon}>
            <Ionicons
              name="medkit-outline"
              size={28}
              color={cardTheme.accents.blue}
            />
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
            <Ionicons
              name="arrow-forward"
              size={22}
              color={cardTheme.accents.blue}
            />
          </View>
        </CareCard>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.navigate('/medications')}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <CareCard
          tone="amber"
          style={{ borderRadius: radius.md }}
          contentStyle={styles.medicationCard}
        >
          <View style={styles.smallIcon}>
            <Ionicons
              name="medical-outline"
              size={24}
              color={cardTheme.accents.amber}
            />
          </View>
          <View style={styles.profileCopy}>
            <AppText style={styles.actionTitle}>Daily medications</AppText>
            <AppText variant="caption" style={styles.secondary}>
              View your schedule and track doses
            </AppText>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={cardTheme.accents.blue}
          />
        </CareCard>
      </Pressable>
    </Screen>
  );
}

const createStyles = (cardTheme: ReturnType<typeof useCareCardColors>) =>
  StyleSheet.create({
    profileCard: {
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
      backgroundColor: cardTheme.subtle,
    },
    initial: { fontSize: 26, fontWeight: '700', color: cardTheme.accents.blue },
    profileCopy: { flex: 1, minWidth: 0 },
    eyebrow: {
      fontSize: 10,
      lineHeight: 16,
      letterSpacing: 1.2,
      color: cardTheme.supporting,
      fontWeight: '700',
    },
    name: { color: cardTheme.heading, flexShrink: 1 },
    profileMeta: { color: cardTheme.supporting },
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
    badgeText: { color: cardTheme.accents.blue, fontWeight: '600' },
    profileLink: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    linkText: { color: cardTheme.accents.blue, fontWeight: '600' },
    sectionIntro: { gap: spacing.xs, marginTop: spacing.sm },
    heading: { color: cardTheme.heading, fontSize: 22, textAlign: 'center' },
    secondary: { color: cardTheme.supporting, textAlign: 'center' },
    channelCard: {
      padding: spacing.lg,
      gap: spacing.sm,
    },
    channelIcon: {
      alignSelf: 'center',
      backgroundColor: cardTheme.subtle,
      width: 52,
      height: 52,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    channelTitle: {
      color: cardTheme.heading,
      fontWeight: '700',
      textAlign: 'center',
    },
    channelDescription: {
      color: cardTheme.supporting,
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
      borderTopColor: cardTheme.border,
    },
    channelAction: {
      color: cardTheme.heading,
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
    },
    medicationCard: {
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
      backgroundColor: cardTheme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionTitle: { color: cardTheme.heading, fontWeight: '700' },
    pressed: { opacity: 0.8 },
  });
