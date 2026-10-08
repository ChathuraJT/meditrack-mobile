import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from './AuthProvider';
import { SignOutButton } from './SignOutButton';
export function UnsupportedRoleScreen() {
  const { profile } = useAuth();
  return (
    <Screen>
      <AppText variant="heading">Use MediTrack on the web</AppText>
      <AppText>
        This mobile app currently supports patient accounts. Your{' '}
        {profile?.role} account does not have a mobile dashboard. Please use the
        main web application.
      </AppText>
      <SignOutButton />
    </Screen>
  );
}
