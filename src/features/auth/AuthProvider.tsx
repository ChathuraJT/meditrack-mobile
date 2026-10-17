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
import { queryClient } from '@/lib/query-client';
import { apiConfigured, apiFetch, clearSessionToken } from '@/lib/api';
import { emptyDraft, type RegistrationDraft, type AuthStatus } from './model';

export type UserRole = 'patient' | 'doctor' | 'lab';

export interface DjangoUser {
  id: number;
  username: string;
  email?: string;
  role: UserRole;
  doctorID: string | null;
  lab_name: string | null;
  license_id: string | null;
  lab_address: string | null;
}

export interface DjangoSession {
  user: DjangoUser;
}

const onboardingKey = 'meditrack.onboarding.completed.v1';

type AuthContextValue = {
  session: DjangoSession | null;
  status: AuthStatus;
  initializing: boolean;
  onboarded: boolean;
  error: string | null;
  available: boolean;
  retry: () => void;
  signIn: () => Promise<void>;
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
  const [session, setSession] = useState<DjangoSession | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState(emptyDraft);
  const [pendingPhone, setPendingPhone] = useState('');
  const [smsSentAt, setSmsSentAt] = useState(0);
  
  const userId = useRef<number | undefined>(undefined);

  const clearUserData = useCallback(() => {
    void queryClient.cancelQueries();
    queryClient.clear();
    setDraft(emptyDraft);
    setPendingPhone('');
    setSmsSentAt(0);
  }, []);

  const applySession = useCallback((next: DjangoSession | null) => {
    if (userId.current !== next?.user.id) {
      void queryClient.cancelQueries();
      queryClient.clear();
      if (userId.current) clearUserData();
    }
    userId.current = next?.user.id;
    setSession(next);
    if (next) {
      setOnboarded(true);
      void AsyncStorage.setItem(onboardingKey, 'true').catch(() => {});
    }
  }, [clearUserData]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const completed = await AsyncStorage.getItem(onboardingKey);
        if (!active) return;
        setOnboarded(!__DEV__ && completed === 'true');

        if (apiConfigured) {
          try {
            const data = await apiFetch('/session/');
            if (!data || !('user' in data)) throw new Error('Invalid session response');
            if (active) applySession(data.user ? { user: data.user } : null);
          } catch (e: any) {
            if (e?.status === 401 || e?.status === 403) {
              await clearSessionToken();
              if (active) applySession(null);
            } else {
              // Network/server failure, retain the token but show error
              throw e;
            }
          }
        }
      } catch {
        if (active) {
          setError('We couldn’t restore your account or local setup. Check your connection and retry.');
        }
      } finally {
        if (active) setInitializing(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [attempt, applySession]);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(onboardingKey, 'true');
    setOnboarded(true);
  };

  const signIn = async () => {
    // Confirm the server cookie was retained before exposing protected screens.
    const data = await apiFetch('/session/');
    if (!data?.user?.id) throw new Error('The login session could not be restored.');
    await clearSessionToken();
    setError(null);
    applySession({ user: data.user });
  };

  const signOut = async () => {
    // Cookie sessions must be revoked by the server before reporting sign-out.
    await apiFetch('/logout/', { method: 'POST' });
    await clearSessionToken();
    await queryClient.cancelQueries();
    clearUserData();
    userId.current = undefined;
    setSession(null);
    setError(null);
    setOnboarded(true); // Keep onboarding completed
  };

  const status: AuthStatus = initializing
    ? 'initializing'
    : error
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
        available: apiConfigured,
        retry: () => {
          setInitializing(true);
          setError(null);
          setAttempt((v) => v + 1);
        },
        signIn,
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
