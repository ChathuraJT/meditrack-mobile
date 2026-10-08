import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import {
  currentAccount,
  signOutAccount,
  type AccountProfile,
} from './supabase-auth';
const onboardingKey = 'meditrack.onboarding.completed.v1';
type AuthContextValue = {
  profile: AccountProfile | null;
  initializing: boolean;
  onboarded: boolean;
  error: string | null;
  available: boolean;
  retry: () => void;
  completeOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const signingIn = useRef(false);
  const revision = useRef(0);
  useEffect(() => {
    let active = true;
    async function restore() {
      const request = ++revision.current;
      try {
        const completed = await AsyncStorage.getItem(onboardingKey);
        await AsyncStorage.removeItem('meditrack_user');
        const next = supabase ? await currentAccount(supabase) : null;
        if (active && request === revision.current) {
          setProfile(next);
          setOnboarded(completed === 'true' || !!next);
          setError(null);
        }
      } catch (failure) {
        if (active && request === revision.current) {
          setProfile(null);
          setError(
            failure instanceof Error
              ? failure.message
              : 'Unable to restore your account. Retry or sign out.',
          );
        }
      } finally {
        if (active && request === revision.current) setInitializing(false);
      }
    }
    void restore();
    // No awaited Supabase calls inside onAuthStateChange (the SDK holds its auth lock).
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (!active || event === 'INITIAL_SESSION' || signingIn.current) return;
      if (event === 'SIGNED_OUT') {
        revision.current++;
        setProfile(null);
        setError(null);
        setInitializing(false);
        void queryClient.cancelQueries();
        queryClient.clear();
      } else {
        setTimeout(() => {
          if (active) void restore();
        }, 0);
      }
    }).data.subscription;
    const lifecycle = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (Platform.OS !== 'web') supabase?.auth.startAutoRefresh();
        if (!signingIn.current) void restore();
      } else if (Platform.OS !== 'web') supabase?.auth.stopAutoRefresh();
    });
    if (Platform.OS !== 'web' && AppState.currentState === 'active')
      supabase?.auth.startAutoRefresh();
    return () => {
      active = false;
      revision.current++;
      subscription?.unsubscribe();
      lifecycle.remove();
      if (Platform.OS !== 'web') supabase?.auth.stopAutoRefresh();
    };
  }, [attempt]);
  async function completeOnboarding() {
    await AsyncStorage.setItem(onboardingKey, 'true');
    setOnboarded(true);
  }
  async function signIn(email: string, password: string) {
    if (!supabase || signingIn.current) return;
    signingIn.current = true;
    revision.current++;
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (loginError) throw loginError;
      const next = await currentAccount(supabase);
      if (!next)
        throw new Error('No session was returned. Please sign in again.');
      await AsyncStorage.setItem(onboardingKey, 'true');
      await queryClient.cancelQueries();
      queryClient.clear();
      setProfile(next);
      setOnboarded(true);
      setError(null);
    } catch (failure) {
      await supabase.auth.signOut({ scope: 'local' });
      setProfile(null);
      throw failure;
    } finally {
      signingIn.current = false;
    }
  }
  async function signOut() {
    if (supabase) await signOutAccount(supabase);
    revision.current++;
    await AsyncStorage.removeItem('meditrack_user');
    await queryClient.cancelQueries();
    queryClient.clear();
    setProfile(null);
    setError(null);
    setOnboarded(true);
    setInitializing(false);
  }
  return (
    <AuthContext.Provider
      value={{
        profile,
        initializing,
        onboarded,
        error,
        available: !!supabase,
        retry: () => {
          setError(null);
          setInitializing(true);
          setAttempt((v) => v + 1);
        },
        completeOnboarding,
        signIn,
        signOut,
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
