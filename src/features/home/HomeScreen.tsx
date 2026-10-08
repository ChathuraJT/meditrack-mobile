import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/theme/tokens';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
export function HomeScreen() {
  return (
    <Screen>
      <View style={styles.brand}>
        <Ionicons
          name="medical-outline"
          size={26}
          color={colors.primary}
          accessible={false}
        />
        <AppText variant="heading" style={styles.centerText}>MediTrack</AppText>
      </View>
      <AppCard>
        <AppText variant="heading" style={styles.centerText}>Your care space</AppText>
        <AppText muted style={styles.centerText}>
          Explore the areas that will support medication routines and recovery
          in future research phases.
        </AppText>
        <AppButton
          label="Explore medications"
          onPress={() => router.navigate('/medications')}
        />
        <AppButton
          label="Explore recovery"
          onPress={() => router.navigate('/recovery')}
        />
        <AppButton
          label="Explore healthcare map"
          onPress={() => router.navigate('/map')}
        />
        <AppButton
          label="Your profile"
          onPress={() => router.navigate('/profile')}
        />
      </AppCard>
    </Screen>
  );
}
const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  intro: {
    gap: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  eyebrow: { color: colors.primary, fontWeight: '700', letterSpacing: 2 },
  centerText: { textAlign: 'center' },
});
