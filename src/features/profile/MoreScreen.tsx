import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePatientProfile } from '@/features/auth/profile';
import { SignOutButton } from '@/features/auth/SignOutButton';
export function MoreScreen() {
  const { session } = useAuth();
  const { data: profile } = usePatientProfile();
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        More
      </AppText>
      <AppCard>
        <AppText variant="heading">Your account</AppText>
        <AppText>{profile?.full_name}</AppText>
        <AppText muted>{session?.user.phone}</AppText>
        <AppText muted>
          {session?.user.email_confirmed_at && session.user.email
            ? `Verified email: ${session.user.email}`
            : 'Email is optional. Add and verify it for another way to sign in.'}
        </AppText>
        <AppButton
          label="Email verification"
          onPress={() => router.push('/email-link')}
        />
      </AppCard>
      <AppCard>
        <AppText variant="heading">Built for healthcare research</AppText>
        <AppText muted>
          Symptom intelligence, doctor matching, doctor-approved prescription
          support, adherence, recovery, disease intelligence, and laboratory
          workflows are planned for later phases.
        </AppText>
      </AppCard>
      <SignOutButton />
    </Screen>
  );
}
