import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { spacing, radius } from '@/theme/tokens';
export function RegionalRadarCard() {
  return (
    <>
      <AppCard style={styles.card}>
        <View style={styles.radarHeaderRow}>
          <View style={styles.titleWithIcon}>
            <View style={styles.iconSquareAmber}>
              <Ionicons name="radio-outline" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="heading" style={styles.sectionHeading}>
                Regional Viral Outbreak Radar
              </AppText>
              <AppText variant="caption" muted style={{ textAlign: 'center' }}>
                Epidemic surveillance & district threat levels
              </AppText>
            </View>
          </View>
          <Pressable
            onPress={() => router.navigate('/map')}
            style={styles.radarMapLink}
          >
            <AppText variant="caption" style={styles.radarMapLinkText}>
              Radar Map
            </AppText>
            <Ionicons name="chevron-forward" size={13} color="#145DA0" />
          </Pressable>
        </View>

        <View style={styles.districtList}>
          {/* Colombo District */}
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
                style={{ fontWeight: '700', color: '#9F1239' }}
              >
                Influenza A & Dengue Serotype 2:
              </AppText>{' '}
              342 localized cases detected in the past 7 days.
            </AppText>
          </View>

          {/* Gampaha District */}
          <View style={styles.districtAlertBoxAmber}>
            <View style={styles.districtHeader}>
              <View style={styles.districtNameRow}>
                <Ionicons
                  name="thermometer-outline"
                  size={15}
                  color="#D97706"
                />
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

          {/* Kandy District */}
          <View style={styles.districtAlertBoxGreen}>
            <View style={styles.districtHeader}>
              <View style={styles.districtNameRow}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={15}
                  color="#059669"
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
    </>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7F2',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  iconSquareAmber: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234B',
  },
  radarHeaderRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radarMapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  radarMapLinkText: {
    color: '#145DA0',
    fontWeight: '800',
    fontSize: 11,
  },
  districtList: {
    gap: spacing.xs,
  },
  districtAlertBoxRed: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
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
    color: '#9F1239',
    fontWeight: '800',
    fontSize: 12,
  },
  highSpikeBadge: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  highSpikeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
  },
  districtDescRed: {
    color: '#881337',
    fontSize: 11,
    lineHeight: 16,
  },
  districtAlertBoxAmber: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  districtTitleAmber: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 12,
  },
  moderateBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  moderateText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
  },
  districtDescAmber: {
    color: '#78350F',
    fontSize: 11,
  },
  districtAlertBoxGreen: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  districtTitleGreen: {
    color: '#065F46',
    fontWeight: '800',
    fontSize: 12,
  },
  lowRiskText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 10,
  },
});
