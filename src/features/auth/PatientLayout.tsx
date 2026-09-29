import { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { useAuth } from './AuthProvider';
import { usePatientProfile } from './profile';
import { CompleteProfileScreen } from './CompleteProfileScreen';
import { SignOutButton } from './SignOutButton';

export function PatientLayout() {
  const { session, draft } = useAuth();
  const profile = usePatientProfile();
  const offeredEmail = useRef(false);
  useEffect(() => {
    if (
      profile.data &&
      draft.email &&
      !session?.user.email_confirmed_at &&
      !offeredEmail.current
    ) {
      offeredEmail.current = true;
      router.push('/email-link');
    }
  }, [profile.data, draft.email, session?.user.email_confirmed_at]);
  if (!session?.user.phone_confirmed_at)
    return (
      <Screen>
        <AppText variant="heading">Phone verification required</AppText>
        <AppText>
          This patient app requires a verified mobile number. Sign out and use
          the pending phone verification flow to complete registration.
        </AppText>
        <SignOutButton />
      </Screen>
    );
  if (profile.isPending)
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel="Loading your profile" />
        <AppText>Preparing your care space…</AppText>
      </Screen>
    );
  if (profile.isError)
    return (
      <Screen>
        <AppText variant="heading">Your account is ready</AppText>
        <AppText>
          Profile setup could not be completed. Check your connection or contact
          the team if database setup is pending. You do not need to register
          again.
        </AppText>
        <AppButton
          label="Retry profile setup"
          loading={profile.isFetching}
          onPress={() => {
            void profile.refetch();
          }}
        />
        <SignOutButton />
      </Screen>
    );
  if (!profile.data) return <CompleteProfileScreen />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="email-link" />
    </Stack>
  );
}
