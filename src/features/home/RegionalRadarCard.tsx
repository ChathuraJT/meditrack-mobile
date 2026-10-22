import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { spacing, radius, useThemeColors } from '@/theme/tokens';

export function RegionalRadarCard() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <AppCard>
      <View style={styles.radarHeaderRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconSquareAmber}>
            <Ionicons name="radio-outline" size={19} color={colors.warning} />
          </View>
          <View style={styles.titleCopy}>
            <AppText variant="heading" style={styles.sectionHeading}>
              Regional Viral Outbreak Radar
            </AppText>
            <AppText variant="caption" muted>
              Epidemic surveillance & district threat levels
            </AppText>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open regional outbreak radar map"
          onPress={() => router.navigate('/map')}
          style={styles.radarMapLink}
        >
          <AppText variant="caption" style={styles.radarMapLinkText}>
            Radar Map
          </AppText>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>
      <View style={styles.districtList}>
        <View style={styles.districtAlertBoxRed}>
          <View style={styles.districtHeader}>
            <View style={styles.districtNameRow}>
              <Ionicons name="warning" size={15} color="#E11D48" />
              <AppText style={styles.districtTitleRed}>
                Colombo District
              </AppText>
            </View>
            <View style={styles.highSpikeBadge}>
              <AppText variant="caption" style={styles.highSpikeText}>
                High Spike
              </AppText>
            </View>
          </View>
          <AppText variant="caption" style={styles.districtDescRed}>
            <AppText
              variant="caption"
              style={{ fontWeight: '700', color: colors.errorText }}
            >
              Influenza A & Dengue Serotype 2:
            </AppText>{' '}
            342 localized cases detected in the past 7 days.
          </AppText>
        </View>

        <View style={styles.districtAlertBoxAmber}>
          <View style={styles.districtHeader}>
            <View style={styles.districtNameRow}>
              <Ionicons name="thermometer-outline" size={15} color="#D97706" />
              <AppText style={styles.districtTitleAmber}>
                Gampaha District
              </AppText>
            </View>
            <View style={styles.moderateBadge}>
              <AppText variant="caption" style={styles.moderateText}>
                Moderate
              </AppText>
            </View>
          </View>
          <AppText variant="caption" style={styles.districtDescAmber}>
            Seasonal viral pharyngitis cases rising (+18% week-over-week).
          </AppText>
        </View>

        <View style={styles.districtAlertBoxGreen}>
          <View style={styles.districtHeader}>
            <View style={styles.districtNameRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={15}
                color={colors.successText}
              />
              <AppText style={styles.districtTitleGreen}>
                Kandy District
              </AppText>
            </View>
            <AppText variant="caption" style={styles.lowRiskText}>
              Normal Baseline (Low Risk)
            </AppText>
          </View>
        </View>
      </View>
    </AppCard>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    titleWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
      minWidth: 0,
    },
    titleCopy: {
      flex: 1,
      minWidth: 0,
    },
    iconSquareAmber: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: colors.warningSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionHeading: {
      fontSize: 17,
      lineHeight: 23,
      fontWeight: '700',
      color: colors.text,
    },
    radarHeaderRow: {
      flexWrap: 'wrap',
      gap: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    radarMapLink: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: spacing.xs,
    },
    radarMapLinkText: {
      color: colors.primary,
      fontWeight: '700',
    },
    districtList: {
      gap: spacing.sm,
    },
    districtAlertBoxRed: {
      backgroundColor: colors.errorSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      padding: spacing.sm,
      gap: spacing.xs,
    },
    districtHeader: {
      flexWrap: 'wrap',
      gap: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    districtNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    districtTitleRed: {
      color: colors.errorText,
      fontWeight: '700',
    },
    highSpikeBadge: {
      backgroundColor: '#E11D48',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 20,
    },
    highSpikeText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    districtDescRed: {
      color: colors.errorText,
    },
    districtAlertBoxAmber: {
      backgroundColor: colors.warningSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      padding: spacing.sm,
      gap: spacing.xs,
    },
    districtTitleAmber: {
      color: colors.warningText,
      fontWeight: '700',
    },
    moderateBadge: {
      backgroundColor: '#D97706',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 20,
    },
    moderateText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    districtDescAmber: {
      color: colors.warningText,
    },
    districtAlertBoxGreen: {
      backgroundColor: colors.successSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      padding: spacing.sm,
    },
    districtTitleGreen: {
      color: colors.successText,
      fontWeight: '700',
    },
    lowRiskText: {
      color: colors.successText,
      fontWeight: '700',
    },
  });
