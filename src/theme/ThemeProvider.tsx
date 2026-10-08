import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palettes, type ThemeMode, type ThemeColors } from './tokens';

const preferenceKey = 'meditrack.appearance.v1';
type ThemeValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  ready: boolean;
  saving: boolean;
  error: string | null;
  setMode: (mode: ThemeMode) => Promise<void>;
};
const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({
  children,
  enabled,
}: PropsWithChildren<{ enabled: boolean }>) {
  const [preference, setPreference] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const cached = await AsyncStorage.getItem(preferenceKey);
        if (active && (cached === 'light' || cached === 'dark'))
          setPreference(cached);
        else if (cached !== null && cached !== 'light' && cached !== 'dark')
          await AsyncStorage.removeItem(preferenceKey);
      } catch {
        if (active)
          setError(
            'Could not restore your appearance preference. Choose a mode to save it again.',
          );
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  async function setMode(next: ThemeMode) {
    if (!ready || lock.current) return;
    lock.current = true;
    setSaving(true);
    setError(null);
    setPreference(next);
    try {
      await AsyncStorage.setItem(preferenceKey, next);
    } catch {
      setError(
        'This mode is applied, but could not be saved. Select it again to retry.',
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  const mode = enabled ? preference : 'light';
  return (
    <ThemeContext.Provider
      value={{ mode, colors: palettes[mode], ready, saving, error, setMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
// Build each palette's StyleSheet once, then select it without recreating styles.
export function createThemedStyles<T>(factory: (colors: ThemeColors) => T) {
  return { light: factory(palettes.light), dark: factory(palettes.dark) };
}
export function useThemedStyles<T>(styles: Record<ThemeMode, T>) {
  return styles[useTheme().mode];
}
