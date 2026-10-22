import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from './AuthProvider';
import { SignOutButton } from './SignOutButton';
import { View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppBottomNav } from '@/components/AppBottomNav';
import { TrackingProvider } from '@/features/tracking/TrackingProvider';

export function PatientLayout() {
  const { session } = useAuth();

  const role = session?.user?.role;

  if (role !== 'patient') {
    return (
      <Screen>
        <AppText variant="heading">Unsupported role</AppText>
        <AppText>
          This app is currently for patients only. Your account role is &apos;
          {role || 'unknown'}&apos;. Please use the web platform or sign in with
          a patient account.
        </AppText>
        <SignOutButton />
      </Screen>
    );
  }

  return (
    <TrackingProvider key={session!.user.id} userId={session!.user.id}>
      <View style={{ flex: 1 }}>
        <AppHeader />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="channel-doctor"
            options={{
              headerShown: false,
              title: 'Channel a Doctor',
              headerShadowVisible: false,
            }}
          />
        </Stack>
        <AppBottomNav />
      </View>
    </TrackingProvider>
  );
}
