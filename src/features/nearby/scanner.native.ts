import Constants, { ExecutionEnvironment } from 'expo-constants';
import { PermissionsAndroid, Platform } from 'react-native';
import type { BleManager, Subscription } from 'react-native-ble-plx';
import type { Scanner } from './controller';

export const availabilityMessage =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ? 'BLE scanning needs a native development build. Expo Go does not include the Bluetooth module.'
    : null;

export function createScanner(): Scanner {
  let cancelled = false;
  let manager: BleManager | undefined;
  let subscription: Subscription | undefined;
  let cancelStateWait: (() => void) | undefined;
  return {
    async start(onDevice, onError) {
      if (availabilityMessage) throw new Error(availabilityMessage);
      if (Platform.OS === 'android') {
        const permissions =
          Number(Platform.Version) >= 31
            ? [
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
              ]
            : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
        const result = await PermissionsAndroid.requestMultiple(permissions);
        if (
          permissions.some(
            (permission) =>
              result[permission] !== PermissionsAndroid.RESULTS.GRANTED,
          )
        )
          throw new Error(
            'Bluetooth scan permission was denied. Allow Nearby devices (or Location on Android 11 and earlier) in app settings.',
          );
      }
      if (cancelled) return;
      const ble = await import('react-native-ble-plx');
      if (cancelled) return;
      manager = new ble.BleManager();
      const state = await new Promise<string>((resolve) => {
        const finish = (value: string) => {
          clearTimeout(timeout);
          resolve(value);
        };
        const timeout = setTimeout(() => finish('Unknown'), 10_000);
        cancelStateWait = () => finish('Cancelled');
        subscription = manager!.onStateChange((value) => {
          if (value !== ble.State.Unknown && value !== ble.State.Resetting)
            finish(value);
        }, true);
      });
      cancelStateWait = undefined;
      subscription?.remove();
      subscription = undefined;
      if (cancelled) return;
      if (state !== ble.State.PoweredOn)
        throw new Error(
          state === ble.State.Unauthorized
            ? 'Bluetooth permission is required. Allow Bluetooth in app settings.'
            : state === ble.State.Unsupported
              ? 'This device does not support BLE scanning.'
              : 'Bluetooth is not ready. Turn Bluetooth on and retry. On Android 11 or earlier, also turn on Location services.',
        );
      subscription = manager.onStateChange((value) => {
        if (!cancelled && value !== ble.State.PoweredOn)
          onError(
            'Bluetooth became unavailable. Check Bluetooth and permissions, then retry.',
          );
      }, false);
      if (cancelled || !manager) return;
      await manager.startDeviceScan(
        null,
        { allowDuplicates: true },
        (error, device) => {
          if (cancelled) return;
          if (error) {
            onError(
              'Bluetooth scan failed. Check Bluetooth, permissions and Location services on older Android devices, then retry.',
            );
            return;
          }
          if (device)
            onDevice({
              id: device.id,
              name: device.localName || device.name,
              rssi: device.rssi,
            });
        },
      );
    },
    async stop() {
      cancelled = true;
      cancelStateWait?.();
      cancelStateWait = undefined;
      subscription?.remove();
      subscription = undefined;
      const active = manager;
      manager = undefined;
      if (active) {
        try {
          await active.stopDeviceScan();
        } finally {
          await active.destroy();
        }
      }
    },
  };
}
