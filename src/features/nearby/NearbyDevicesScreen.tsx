import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { AppState, Linking, Platform, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { spacing, useThemeColors } from '@/theme/tokens';
import { NearbyController } from './controller';
import { availabilityMessage, createScanner } from './scanner';
import { useConsentController } from '@/features/consent/ConsentProvider';

export function NearbyDevicesScreen() {
  const colors = useThemeColors();
  const consent = useConsentController();
  const controller = useMemo(
    () =>
      new NearbyController(
        createScanner,
        Date.now,
        () => consent?.canTrack() ?? false,
      ),
    [consent],
  );
  useEffect(
    () =>
      consent?.subscribe(() => {
        if (!consent.canTrack()) controller.stop('Tracking consent is off.');
      }),
    [consent, controller],
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const [settingsError, setSettingsError] = useState(false);
  useFocusEffect(
    useCallback(() => {
      const listener = AppState.addEventListener('change', (next) => {
        if (next !== 'active')
          controller.stop('Scan stopped when the app left the foreground.');
      });
      return () => {
        listener.remove();
        controller.stop();
      };
    }, [controller]),
  );
  const active = state.scanning || state.starting;
  return (
    <Screen withPattern>
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: colors.button }]}>
          <Ionicons name="bluetooth" color="white" size={32} />
        </View>
        <AppText variant="title">Nearby devices</AppText>
        <AppText muted style={styles.center}>
          Discover devices broadcasting Bluetooth Low Energy signals.
        </AppText>
      </View>
      <AppButton
        label="Terms & consent settings"
        onPress={() => router.push('/consent-settings')}
      />
      <AppCard>
        <AppText variant="heading">
          {state.starting
            ? 'Preparing Bluetooth…'
            : state.scanning
              ? 'Scanning nearby…'
              : 'Ready to scan'}
        </AppText>
        <AppText muted>
          Scan for 30 seconds while this screen is open. Keep Bluetooth on and
          the device you want to find in BLE advertising mode.
        </AppText>
        {availabilityMessage ? (
          <AppText accessibilityRole="alert">{availabilityMessage}</AppText>
        ) : (
          <>
            {!active && (
              <AppButton
                label="Start scan"
                disabled={!consent?.canTrack()}
                onPress={() => void controller.start()}
              />
            )}
            {active && (
              <AppButton
                label="Stop scan"
                onPress={() =>
                  controller.stop('Scan stopped. Device list cleared.')
                }
              />
            )}
          </>
        )}
        {state.error && (
          <AppText accessibilityRole="alert" style={{ color: colors.error }}>
            {state.error}
          </AppText>
        )}
        {state.error && Platform.OS !== 'web' && (
          <AppButton
            label="Open app settings"
            onPress={() => {
              void Linking.openSettings().catch(() => setSettingsError(true));
            }}
          />
        )}
        {settingsError && (
          <AppText>
            Open your phone settings manually to allow Bluetooth access.
          </AppText>
        )}
      </AppCard>
      {state.notice && (
        <AppCard>
          <View style={styles.row}>
            <Ionicons name="radio-outline" size={22} color={colors.primary} />
            <AppText style={styles.flex} accessibilityLiveRegion="polite">
              {state.notice}
            </AppText>
          </View>
        </AppCard>
      )}
      <AppText variant="heading">Detected now · {state.devices.length}</AppText>
      {!state.devices.length && (
        <AppCard>
          <AppText>
            {active ? 'Listening for BLE advertisements…' : 'No active scan'}
          </AppText>
          <AppText muted>
            Bluetooth being on does not make every phone discoverable. The other
            device must broadcast BLE advertisements. This scanner does not make
            this phone broadcast or notify the other device.
          </AppText>
        </AppCard>
      )}
      {state.devices.map((device) => (
        <AppCard key={device.id}>
          <View style={styles.row}>
            <Ionicons name="bluetooth" size={24} color={colors.primary} />
            <AppText variant="heading" style={styles.flex}>
              {device.name || 'Unnamed BLE device'}
            </AppText>
          </View>
          <AppText
            style={{ color: device.strong ? colors.success : colors.secondary }}
          >
            {device.rssi === null
              ? 'Signal strength unavailable'
              : device.strong
                ? 'Strong signal · possibly nearby'
                : 'BLE signal detected'}
          </AppText>
          <AppText muted>
            Signal: {device.rssi === null ? 'Unknown' : `${device.rssi} dBm`}
          </AppText>
          <AppText muted variant="caption">
            Last detected: {new Date(device.lastSeen).toLocaleTimeString()}
          </AppText>
          <AppText muted variant="caption" selectable>
            Device ID: {device.id}
          </AppText>
        </AppCard>
      ))}
      <AppCard>
        <AppText variant="heading">Local discovery only</AppText>
        <AppText muted>
          No GPS coordinates are collected by this scanner. Device details stay
          in memory and clear when scanning stops. Nothing from this scan is
          uploaded.
        </AppText>
        <AppText muted variant="caption">
          Signal strength varies with walls, phone position and hardware. It
          does not confirm distance, a person’s identity or infection risk.
          Devices not heard for 15 seconds disappear; up to 50 signals are
          shown.
        </AppText>
        <AppText muted variant="caption">
          On Android 11 and earlier, the operating system requires Location
          permission and Location services for Bluetooth scanning.
        </AppText>
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
  icon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
