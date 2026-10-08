import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';

export function VerifyPhoneScreen() {
  return (
    <Screen>
      <AppText variant="title">Verify your mobile</AppText>
      <AppText>
        Phone verification via SMS is not currently supported in this backend. Please sign in with an approved account.
      </AppText>
      <AppButton label="Go to Sign In" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
