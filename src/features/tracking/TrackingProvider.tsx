import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';
import { AppState, Platform } from 'react-native';
import { getApiBaseUrl } from '@/lib/api';
import { TrackingController } from './controller';
import { createTrackingStore } from './storage';
import { captureLocation, locationPermission, trackingConsent } from './device';
import { uploadLocations } from './backend';
import { useConsentController } from '@/features/consent/ConsentProvider';

const Context = createContext<TrackingController | null>(null);

export function TrackingProvider({
  userId,
  children,
}: PropsWithChildren<{ userId: number }>) {
  const consent = useConsentController();
  const [controller, setController] = useState<TrackingController | null>(null);
  useEffect(() => {
    let mounted = true;
    const instance = new TrackingController({
      canCollect: () => consent?.canTrack() ?? false,
      store: createTrackingStore(
        AsyncStorage,
        `${getApiBaseUrl().replace(/\/+$/, '')}|${userId}`,
      ),
      consent: (granted) => trackingConsent(granted, userId),
      upload: (samples, signal) => uploadLocations(userId, samples, signal),
      permission: locationPermission,
      capture: captureLocation,
    });
    // Cancels existing capture/uploads immediately when consent is withdrawn.
    // The existing controller persists/retries the legacy server withdrawal.
    let previouslyAllowed = consent?.canTrack() ?? false;
    const unsubscribe = consent?.subscribe(() => {
      const allowed = consent.canTrack();
      if (previouslyAllowed && !allowed) void instance.stop();
      previouslyAllowed = allowed;
    });
    const foreground = () =>
      Platform.OS === 'web'
        ? typeof document !== 'undefined' &&
          document.visibilityState === 'visible'
        : AppState.currentState === 'active';
    // Set initial activity without triggering a second consent request.
    if (!foreground()) instance.setForeground(false);
    void instance.initialize().then(() => {
      if (mounted) {
        setController(instance);
        if (!consent?.canTrack() && instance.getSnapshot().consent)
          void instance.stop();
      }
    });
    const listener = AppState.addEventListener('change', () =>
      instance.setForeground(foreground()),
    );
    const visibility = () => instance.setForeground(foreground());
    if (Platform.OS === 'web')
      document.addEventListener('visibilitychange', visibility);
    return () => {
      mounted = false;
      unsubscribe?.();
      instance.dispose();
      listener.remove();
      if (Platform.OS === 'web')
        document.removeEventListener('visibilitychange', visibility);
    };
  }, [userId, consent]);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
}

export function useTrackingController() {
  return useContext(Context);
}
export function useTrackingState(controller: TrackingController) {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
}
