import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { colors } from '@/theme/tokens';
import { launchDestination } from '@/features/auth/model';

function Routes() {
  const auth = useAuth();
  const destination = launchDestination(
    auth.initializing,
    !!auth.session,
    auth.onboarded,
  );
  if (destination === 'loading')
    return (
      <Screen>
        <ActivityIndicator
          color={colors.primary}
          accessibilityLabel="Restoring your account"
        />
        <AppText>Getting MediTrack ready…</AppText>
      </Screen>
    );
  if (auth.error)
    return (
      <Screen>
        <AppText accessibilityRole="alert">{auth.error}</AppText>
        <AppButton label="Try again" onPress={auth.retry} />
      </Screen>
    );
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={destination === 'onboarding'}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={destination === 'login'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={destination === 'patient'}>
        <Stack.Screen name="(patient)" />
      </Stack.Protected>
    </Stack>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <Routes />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
