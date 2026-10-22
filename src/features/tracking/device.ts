import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import { apiFetch } from '@/lib/api';
import type { LocationSample } from './storage';

export async function trackingConsent(
  granted?: boolean,
  userId?: number,
): Promise<boolean> {
  const result = await apiFetch(
    '/api/exposure/consent/',
    granted === undefined
      ? { expectedUserId: userId }
      : {
          method: 'PUT',
          expectedUserId: userId,
          body: JSON.stringify({ granted }),
        },
  );
  if (typeof result?.granted !== 'boolean')
    throw new Error('Unexpected tracking consent response.');
  return result.granted;
}

export async function locationPermission(request: boolean) {
  const result = request
    ? await Location.requestForegroundPermissionsAsync()
    : await Location.getForegroundPermissionsAsync();
  return result.status;
}

// A short-lived watch lets OFF, sign-out and backgrounding release GPS promptly.
export async function captureLocation(
  signal: AbortSignal,
): Promise<LocationSample> {
  if (signal.aborted) throw new Error('Location capture cancelled.');
  if (!(await Location.hasServicesEnabledAsync()))
    throw new Error(
      'Turn on your device location services to record a location.',
    );
  return new Promise((resolve, reject) => {
    let subscription: Location.LocationSubscription | undefined;
    let settled = false;
    const finish = (error?: Error, value?: LocationSample) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
      subscription?.remove();
      if (error) reject(error);
      else resolve(value!);
    };
    const cancel = () => finish(new Error('Location capture cancelled.'));
    const timeout = setTimeout(
      () =>
        finish(
          new Error(
            'No fresh GPS fix yet. Move near a window; tracking will retry.',
          ),
        ),
      25_000,
    );
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) {
      cancel();
      return;
    }
    void Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 0,
        timeInterval: 1000,
      },
      (fix) => {
        if (settled) return;
        const now = Date.now();
        // Reject stale cached fixes, unknown accuracy and mocked device fixes.
        if (
          fix.mocked ||
          !Number.isFinite(fix.timestamp) ||
          fix.timestamp > now ||
          now - fix.timestamp > 60_000 ||
          fix.coords.accuracy == null ||
          fix.coords.accuracy < 0
        )
          return;
        try {
          finish(undefined, {
            client_record_id: Crypto.randomUUID(),
            latitude: fix.coords.latitude,
            longitude: fix.coords.longitude,
            recorded_at: new Date(fix.timestamp).toISOString(),
            accuracy_m: fix.coords.accuracy,
            data_mode: 'real',
          });
        } catch {
          finish(new Error('Unable to prepare a location record.'));
        }
      },
      () =>
        finish(
          new Error(
            'GPS is unavailable. Check location permission and device settings.',
          ),
        ),
    )
      .then((watch) => {
        subscription = watch;
        if (settled) watch.remove();
      })
      .catch(() =>
        finish(
          new Error(
            'Unable to start GPS. Check location permission and device settings.',
          ),
        ),
      );
  });
}
