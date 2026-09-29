import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';

export function useOnboardingMotion() {
  // Start still until the system preference is known.
  const [reduceMotion, setReduceMotion] = useState(true);
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduceMotion(value);
      })
      .catch(() => {
        /* Keep motion off if the preference cannot be read. */
      });
    const preference = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    const appState = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    // Browser preview also follows the operating system's motion preference.
    const media =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const update = () => setReduceMotion(media?.matches ?? true);
    media?.addEventListener('change', update);
    return () => {
      alive = false;
      preference.remove();
      appState.remove();
      media?.removeEventListener('change', update);
    };
  }, []);
  return { reduceMotion, animate: !reduceMotion && foreground };
}
