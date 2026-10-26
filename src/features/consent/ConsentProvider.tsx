import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { getApiBaseUrl } from '@/lib/api';
import { ConsentController } from './controller';
import { consentDocuments } from './documents';
import { consentScope } from './model';

const Context = createContext<ConsentController | null>(null);

export function ConsentProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const scope = consentScope(getApiBaseUrl(), userId);
  // Anonymous acceptance is never copied to an authenticated account.
  return (
    <ScopedConsent key={scope} scope={scope} userId={userId}>
      {children}
    </ScopedConsent>
  );
}

function ScopedConsent({
  children,
  scope,
  userId,
}: PropsWithChildren<{ scope: string; userId: number | null }>) {
  const [controller, setController] = useState<ConsentController | null>(null);
  useEffect(() => {
    let mounted = true;
    const instance = new ConsentController(
      AsyncStorage,
      scope,
      userId,
      consentDocuments,
    );
    void instance.initialize().then(() => {
      if (mounted) setController(instance);
    });
    return () => {
      mounted = false;
      instance.dispose();
    };
  }, [scope, userId]);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
}

export function useConsentController() {
  return useContext(Context);
}
export function useConsentState(controller: ConsentController) {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
}
