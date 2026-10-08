import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';

export function EmailLinkScreen() {
  return (
    <Screen>
      <AppText variant="title">Email Verification</AppText>
      <AppText>
        Email verification is not currently supported in this backend.
      </AppText>
      <AppButton label="Go Back" onPress={() => router.back()} />
    </Screen>
  );
}
