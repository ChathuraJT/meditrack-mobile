import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { SignOutButton } from '@/features/auth/SignOutButton';
import { AppearanceSetting } from '@/theme/AppearanceSetting';
export function MoreScreen() {
  const { profile } = useAuth();
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        More
      </AppText>
      <AppCard>
        <AppText variant="heading">Your account</AppText>
        <AppText>{profile?.username}</AppText>
        <AppText muted>{profile?.role}</AppText>
      </AppCard>
      <AppearanceSetting />
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
