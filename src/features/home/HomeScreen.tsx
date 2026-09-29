import { router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { colors, spacing } from '@/theme/tokens';
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
        <AppText variant="heading">MediTrack</AppText>
      </View>
      <View style={styles.intro}>
        <AppText variant="caption" style={styles.eyebrow}>
          CARE, CONNECTED
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          Welcome to MediTrack
        </AppText>
        <AppText muted>
          A thoughtful place for your care journey. Your account is ready; care
          features are being built one step at a time.
        </AppText>
      </View>
      <AppCard>
        <AppText variant="heading">Your care space</AppText>
        <AppText muted>
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
          label="Your account and more"
          onPress={() => router.navigate('/more')}
        />
      </AppCard>
      <AppText variant="caption" muted>
        University research project · Account preview. Clinical features are not
        available yet.
      </AppText>
    </Screen>
  );
}
const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  intro: { gap: spacing.md, paddingVertical: spacing.md },
  eyebrow: { color: colors.primary, fontWeight: '700', letterSpacing: 2 },
});
