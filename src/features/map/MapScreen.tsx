import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { spacing, useThemeColors } from '@/theme/tokens';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { RegionalRadarCard } from '@/features/home/RegionalRadarCard';
import { AppButton } from '@/components/ui/AppButton';
import { router } from 'expo-router';

export function MapScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <Screen withPattern>
      <AppCard>
        <AppText variant="heading">Location tracking</AppText>
        <AppText muted>
          Manage consent, GPS permission and locations saved on your device.
        </AppText>
        <AppButton
          label="Manage location tracking"
          onPress={() => router.push('/tracking')}
        />
      </AppCard>

      <AppCard>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="map-outline" size={28} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="heading" style={{ textAlign: 'center' }}>
              Interactive Map
            </AppText>
            <AppText muted style={{ textAlign: 'center' }}>
              Facility locator and health resource finder
            </AppText>
          </View>
        </View>

        <View style={styles.mapPlaceholder}>
          <Ionicons name="location" size={36} color={colors.primary} />
          <AppText style={styles.placeholderTitle}>
            Area Health Services
          </AppText>
          <AppText variant="caption" muted style={{ textAlign: 'center' }}>
            Interactive medical maps and nearby center intelligence will be
            connected in an upcoming phase.
          </AppText>
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="heading">Nearby Centers</AppText>
        <View style={styles.facilityItem}>
          <Ionicons name="business-outline" size={20} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <AppText style={{ fontWeight: '600' }}>
              National Hospital & Clinic
            </AppText>
            <AppText variant="caption" muted>
              Emergency and consultation services
            </AppText>
          </View>
        </View>
        <View style={styles.facilityItem}>
          <Ionicons name="medkit-outline" size={20} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <AppText style={{ fontWeight: '600' }}>Community Pharmacy</AppText>
            <AppText variant="caption" muted>
              Prescription pickup and consultation
            </AppText>
          </View>
        </View>
      </AppCard>

      <RegionalRadarCard />
    </Screen>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    header: {
      gap: spacing.xs,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapPlaceholder: {
      height: 180,
      backgroundColor: colors.subtle,
      borderRadius: 12,
      marginTop: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.md,
      gap: spacing.xs,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
    },
    placeholderTitle: {
      fontWeight: '600',
      fontSize: 16,
      color: colors.text,
    },
    facilityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
  });
