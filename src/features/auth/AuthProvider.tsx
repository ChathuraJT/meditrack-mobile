import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import { useSupabaseLifecycle } from '@/hooks/useSupabaseLifecycle';
import { emptyDraft, type RegistrationDraft, type AuthStatus } from './model';

const onboardingKey = 'meditrack.onboarding.completed.v1';
type AuthContextValue = {
  session: Session | null;
  status: AuthStatus;
  initializing: boolean;
  onboarded: boolean;
  error: string | null;
  available: boolean;
  retry: () => void;
  completeOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
  draft: RegistrationDraft;
  setDraft: (draft: RegistrationDraft) => void;
  pendingPhone: string;
  setPendingPhone: (phone: string) => void;
  smsSentAt: number;
  setSmsSentAt: (value: number) => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  useSupabaseLifecycle();
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState(emptyDraft);
  const [pendingPhone, setPendingPhone] = useState('');
  const [smsSentAt, setSmsSentAt] = useState(0);
  const userId = useRef<string | undefined>(undefined);
  const clearUserData = useCallback(() => {
    void queryClient.cancelQueries();
    queryClient.clear();
    setDraft(emptyDraft);
    setPendingPhone('');
    setSmsSentAt(0);
  }, []);
  useEffect(() => {
    let active = true;
    let revision = 0;
    const applySession = (next: Session | null) => {
      if (!active) return;
      if (userId.current !== next?.user.id) {
        void queryClient.cancelQueries();
        queryClient.clear();
        // Preserve a registration draft only when first signing in.
        if (userId.current) clearUserData();
      }
      userId.current = next?.user.id;
      setSession(next);
      if (next) {
        setOnboarded(true);
        void AsyncStorage.setItem(onboardingKey, 'true').catch(() => {
          // Session restoration still opens the app if local flag storage fails.
        });
      }
    };
    const subscription = supabase?.auth.onAuthStateChange((event, next) => {
      if (!active || event === 'INITIAL_SESSION') return;
      revision++;
      applySession(next);
      setError(null);
    }).data.subscription;
    void (async () => {
      try {
        const completed = await AsyncStorage.getItem(onboardingKey);
        if (!active) return;
        // Replay onboarding on development reloads so Expo Go previews start here.
        // Restored sessions still open the patient app; release builds keep persistence.
        setOnboarded(!__DEV__ && completed === 'true');
        if (supabase) {
          const startRevision = revision;
          const { data, error: restoreError } =
            await supabase.auth.getSession();
          if (restoreError) throw restoreError;
          let restored = data.session;
          if (restored) {
            const { data: validated, error: validationError } =
              await supabase.auth.getUser();
            if (validationError) {
              if (
                validationError.status === 401 ||
                validationError.status === 403
              ) {
                await supabase.auth.signOut({ scope: 'local' });
                restored = null;
              } else throw validationError;
            } else if (validated.user)
              restored = { ...restored, user: validated.user };
          }
          if (revision === startRevision) applySession(restored);
        }
      } catch {
        if (active)
          setError(
            'We couldn’t restore your account or local setup. Check your connection and retry.',
          );
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [attempt, clearUserData]);
  const completeOnboarding = async () => {
    await AsyncStorage.setItem(onboardingKey, 'true');
    setOnboarded(true);
  };
  const signOut = async () => {
    if (supabase) {
      const { error: signOutError } = await supabase.auth.signOut({
        scope: 'local',
      });
      if (signOutError) throw signOutError;
    }
    await queryClient.cancelQueries();
    clearUserData();
    userId.current = undefined;
    setSession(null);
    setError(null);
    setOnboarded(true);
  };
  const status: AuthStatus = initializing
    ? 'initializing'
    : error || !supabase
      ? 'error'
      : session
        ? 'signedIn'
        : 'signedOut';
  return (
    <AuthContext.Provider
      value={{
        session,
        status,
        initializing,
        onboarded,
        error,
        available: !!supabase,
        retry: () => {
          setInitializing(true);
          setError(null);
          setAttempt((v) => v + 1);
        },
        completeOnboarding,
        signOut,
        draft,
        setDraft,
        pendingPhone,
        setPendingPhone,
        smsSentAt,
        setSmsSentAt,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}
