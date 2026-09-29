import { router } from 'expo-router';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
export default function Introduction() {
  return <OnboardingScreen onComplete={() => router.replace('/login')} />;
}
