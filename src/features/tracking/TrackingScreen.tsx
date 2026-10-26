import { useState } from 'react';
import { router } from 'expo-router';
import { Linking, Platform, StyleSheet, Switch, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { spacing, useThemeColors } from '@/theme/tokens';
import { useTrackingController, useTrackingState } from './TrackingProvider';
import type { TrackingController } from './controller';
import { useConsentController } from '@/features/consent/ConsentProvider';

export function TrackingScreen() {
  const controller = useTrackingController();
  return controller ? (
    <TrackingContent controller={controller} />
  ) : (
    <Screen>
      <AppText>Preparing location controls…</AppText>
    </Screen>
  );
}

function TrackingContent({ controller }: { controller: TrackingController }) {
  const consent = useConsentController();
  const state = useTrackingState(controller);
  const palette = useThemeColors();
  const [confirmClear, setConfirmClear] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  const status = state.enabled
    ? state.foreground
      ? 'Tracking on'
      : 'Paused in background'
    : 'Tracking off';
  return (
    <Screen withPattern>
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: palette.button }]}>
          <Ionicons name="navigate-outline" color="white" size={30} />
        </View>
        <AppText variant="heading">Your location, your control</AppText>
        <AppText muted style={styles.center}>
          Build your location history for future exposure checks.
        </AppText>
      </View>
      <AppButton
        label="Find nearby BLE devices"
        onPress={() => router.push('/nearby-devices')}
      />
      <AppCard>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="heading">{status}</AppText>
            <AppText muted variant="caption">
              While you use MediTrack
            </AppText>
          </View>
          <Switch
            accessibilityLabel="Start or stop location recording"
            value={state.enabled}
            disabled={
              !state.ready ||
              (!state.enabled && !consent?.canTrack()) ||
              (!state.enabled && (state.busy || state.pendingOff))
            }
            trackColor={{ false: palette.border, true: palette.accent }}
            onValueChange={(value) => {
              setConfirmClear(false);
              void (value ? controller.start() : controller.stop());
            }}
          />
        </View>
        <AppText>
          Manage your tracking consent in Terms & consent settings first.
          Turning on here requests device permission and starts the existing
          foreground location feature. It does not authorise research copying.
        </AppText>
        <AppButton
          label="Terms & consent settings"
          onPress={() => router.push('/consent-settings')}
        />
        <AppText muted variant="caption">
          A location is requested about once a minute while the app is active.
          Recording pauses when you lock the phone or leave the app. Turn it on
          again after reopening or signing in.
        </AppText>
        <View style={[styles.badge, { backgroundColor: palette.background }]}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={palette.accent}
          />
          <AppText style={styles.flex} variant="caption">
            {state.pendingOff
              ? 'Recording stopped. Consent withdrawal is waiting to sync.'
              : state.consent === null
                ? 'Account consent has not been verified.'
                : state.consent
                  ? 'Account consent granted'
                  : 'Account consent not granted'}
          </AppText>
        </View>
        {!state.enabled && state.consent && !state.pendingOff && (
          <AppButton
            label="Withdraw tracking consent"
            disabled={state.busy}
            onPress={() => router.push('/consent-settings')}
          />
        )}
        {state.busy && (
          <AppText muted accessibilityLiveRegion="polite">
            Updating your location controls…
          </AppText>
        )}
      </AppCard>
      {state.error && (
        <AppCard>
          <AppText accessibilityRole="alert" style={{ color: palette.error }}>
            {state.error}
          </AppText>
          <AppButton
            label={
              state.pendingOff
                ? 'Retry consent withdrawal'
                : 'Retry setup / refresh consent'
            }
            loading={state.busy}
            onPress={() =>
              void (state.ready
                ? controller.refreshConsent()
                : controller.initialize())
            }
          />
        </AppCard>
      )}
      <AppCard>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={24} color={palette.primary} />
          <AppText variant="heading">Location permission</AppText>
        </View>
        <AppText>
          {state.permission === 'granted'
            ? 'Allowed on this device'
            : state.permission === 'denied'
              ? 'Not allowed on this device'
              : 'Permission will be requested when you turn tracking on'}
        </AppText>
        <AppText muted variant="caption">
          Device permission and account consent are separate. Both are needed
          before recording starts.
        </AppText>
        {state.permission === 'denied' &&
          (Platform.OS === 'web' ? (
            <AppText muted>
              Allow location in your browser site settings, then turn tracking
              on again. Use HTTPS or localhost.
            </AppText>
          ) : (
            <AppButton
              label="Open device settings"
              onPress={() => {
                void Linking.openSettings().catch(() => setSettingsError(true));
              }}
            />
          ))}
        {settingsError && (
          <AppText accessibilityRole="alert">
            Open your phone settings and allow location for MediTrack.
          </AppText>
        )}
      </AppCard>
      <AppCard>
        <View style={styles.row}>
          <Ionicons
            name="phone-portrait-outline"
            size={24}
            color={palette.primary}
          />
          <AppText variant="heading">Saved on this device</AppText>
        </View>
        <View style={styles.row}>
          <AppText variant="title">{state.count.toLocaleString()}</AppText>
          <AppText muted style={styles.flex}>
            location records · up to 14 days
          </AppText>
        </View>
        <AppText muted>
          Works offline after tracking is enabled. Pending records upload in
          batches while tracking is on and the app is active. Records older than
          14 days are excluded.
        </AppText>
        {state.latest ? (
          <View style={[styles.details, { borderColor: palette.border }]}>
            <AppText variant="caption" muted>
              LAST SAVED LOCATION
            </AppText>
            <AppText selectable>
              {state.latest.latitude.toFixed(6)},{' '}
              {state.latest.longitude.toFixed(6)}
            </AppText>
            <AppText variant="caption">
              {new Date(state.latest.recorded_at).toLocaleString()}
            </AppText>
            <AppText variant="caption" muted>
              Reported accuracy: {Math.round(state.latest.accuracy_m)} m
            </AppText>
          </View>
        ) : (
          <AppText muted>
            No saved locations yet. Turn on tracking to capture your first
            location.
          </AppText>
        )}
        {state.capturing && (
          <AppText accessibilityLiveRegion="polite" muted>
            Getting a fresh location…
          </AppText>
        )}
        <AppText variant="caption" muted>
          Expired records are removed when the app runs. Turning off stops new
          recordings; it does not erase saved locations.
        </AppText>
        {state.count > 0 &&
          !state.enabled &&
          (confirmClear ? (
            <>
              <AppText>
                Delete this account’s local locations from this device? This
                cannot be undone.
              </AppText>
              <AppButton
                label="Delete local locations"
                loading={state.busy}
                onPress={() => {
                  setConfirmClear(false);
                  void controller.clearLocal();
                }}
              />
              <AppButton
                label="Keep locations"
                onPress={() => setConfirmClear(false)}
              />
            </>
          ) : (
            <AppButton
              label="Clear local locations"
              disabled={state.busy}
              onPress={() => setConfirmClear(true)}
            />
          ))}
      </AppCard>
      <AppCard>
        <AppText accessibilityLiveRegion="polite">
          {state.uploading
            ? 'Uploading records…'
            : `${state.pendingCount.toLocaleString()} records waiting to upload`}
        </AppText>
        <AppText muted>
          Last successful upload:{' '}
          {state.lastUpload
            ? new Date(state.lastUpload).toLocaleString()
            : 'No uploads yet'}
        </AppText>
        {state.uploadError && (
          <AppText accessibilityRole="alert" style={{ color: palette.error }}>
            {state.uploadError}
          </AppText>
        )}
        <AppText muted variant="caption">
          Upload retries automatically each minute while tracking is on. Turning
          off stops new uploads; a batch already received by the server may
          still be saved. Clearing local records does not delete server history.
        </AppText>
        <AppButton
          label="View location history"
          onPress={() => router.push('/location-history')}
        />
        <AppButton
          label="View exposure analysis"
          onPress={() => router.push('/exposure-analysis')}
        />
      </AppCard>
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  center: { textAlign: 'center' },
  icon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  flex: { flex: 1 },
  badge: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  details: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.xs },
});
