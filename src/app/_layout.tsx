import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { launchDestination } from '@/features/auth/model';
import { queryClient } from '@/lib/query-client';
import { useThemeColors } from '@/theme/tokens';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator } from 'react-native';
import { ThemeProvider, useColorScheme } from '@/theme/ThemeProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  ConsentProvider,
  useConsentController,
  useConsentState,
} from '@/features/consent/ConsentProvider';
import type { ConsentController } from '@/features/consent/controller';

function Routes() {
  const consent = useConsentController();
  return consent ? (
    <ConsentRoutes consent={consent} />
  ) : (
    <Screen>
      <AppText>Loading your choices…</AppText>
    </Screen>
  );
}

function ConsentRoutes({ consent }: { consent: ConsentController }) {
  const consentState = useConsentState(consent);
  const colors = useThemeColors();
  const auth = useAuth();
  const destination = launchDestination(
    auth.initializing,
    !!auth.session,
    auth.onboarded,
  );
  if (destination === 'loading' || (!consentState.ready && !consentState.error))
    return (
      <Screen>
        <ActivityIndicator
          color={colors.primary}
          accessibilityLabel="Restoring your account"
        />
        <AppText>Getting MediTrack ready…</AppText>
      </Screen>
    );
  if (!consentState.ready && consentState.error)
    return (
      <Screen>
        <AppText accessibilityRole="alert">{consentState.error}</AppText>
        <AppButton
          label="Retry loading choices"
          onPress={() => void consent.initialize()}
        />
      </Screen>
    );
  const accepted = consent.requiredAccepted();
  if (auth.error && accepted)
    return (
      <Screen>
        <AppText accessibilityRole="alert">{auth.error}</AppText>
        <AppButton label="Try again" onPress={auth.retry} />
      </Screen>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!accepted}>
        <Stack.Screen name="terms" />
      </Stack.Protected>
      <Stack.Protected guard={accepted && destination === 'onboarding'}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={accepted && destination === 'login'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={accepted && destination === 'patient'}>
        <Stack.Screen name="(patient)" />
      </Stack.Protected>
    </Stack>
  );
}
export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedRoot />
    </ThemeProvider>
  );
}

function ThemedRoot() {
  const scheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <ConsentProvider>
            <Routes />
          </ConsentProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
