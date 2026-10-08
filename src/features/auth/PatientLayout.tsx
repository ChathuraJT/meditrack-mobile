import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from './AuthProvider';
import { SignOutButton } from './SignOutButton';

export function PatientLayout() {
  const { session } = useAuth();
  
  const role = session?.user?.role;
  
  if (role !== 'patient') {
    return (
      <Screen>
        <AppText variant="heading">Unsupported role</AppText>
        <AppText>
          This app is currently for patients only. Your account role is &apos;{role || 'unknown'}&apos;. Please use the web platform or sign in with a patient account.
        </AppText>
        <SignOutButton />
      </Screen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
