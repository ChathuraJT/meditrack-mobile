import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type Mode = 'light' | 'dark';
const KEY = 'meditrack.appearance.v1';
const ThemeContext = createContext<{
  mode: Mode;
  ready: boolean;
  saving: boolean;
  error: string | null;
  toggle: () => Promise<void>;
} | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useSystemColorScheme();
  const [choice, setChoice] = useState<Mode | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const mode = choice ?? (system === 'dark' ? 'dark' : 'light');
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(KEY)
      .then((value) => {
        if (active && (value === 'light' || value === 'dark')) setChoice(value);
      })
      .catch(() => {
        if (active) setError('Could not restore your appearance preference.');
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const toggle = async () => {
    if (!ready || lock.current) return;
    lock.current = true;
    const next = mode === 'dark' ? 'light' : 'dark';
    setChoice(next);
    setSaving(true);
    setError(null);
    try {
      await AsyncStorage.setItem(KEY, next);
    } catch {
      setError('Appearance changed for this session, but could not be saved.');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  return (
    <ThemeContext.Provider value={{ mode, ready, saving, error, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppearance() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('Appearance controls need ThemeProvider.');
  return value;
}

export function useColorScheme() {
  const value = useContext(ThemeContext);
  const system = useSystemColorScheme();
  return value?.mode ?? system ?? 'light';
}
