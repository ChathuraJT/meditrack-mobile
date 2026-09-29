import { useState } from 'react';
import { router } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppText } from '@/components/ui/AppText';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { normalizePhone, authErrorMessage } from './model';
import {
  AuthScreen,
  Feedback,
  TextAction,
  useCooldown,
  useSubmission,
} from './components';
export function VerifyPhoneScreen() {
  const { pendingPhone, setPendingPhone, smsSentAt, setSmsSentAt, available } =
    useAuth();
  const [phoneInput, setPhoneInput] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const { busy, run } = useSubmission();
  const remaining = useCooldown(smsSentAt);
  async function resend() {
    await run(async () => {
      if (!supabase || remaining > 0) return;
      const phone = pendingPhone || normalizePhone(phoneInput);
      if (!phone) {
        setMessage(
          'Enter a valid registered mobile number. Sri Lanka is the default; international numbers need +country code.',
        );
        return;
      }
      setMessage('');
      setNotice('');
      try {
        const { error } = await supabase.auth.resend({ type: 'sms', phone });
        if (error) throw error;
        setPendingPhone(phone);
        setSmsSentAt(Date.now());
        setNotice(
          'If a registration is pending, a new code has been requested. Use the latest SMS.',
        );
      } catch (error) {
        setMessage(authErrorMessage(error));
        setSmsSentAt(Date.now());
      }
    });
  }
  async function verify() {
    await run(async () => {
      if (!supabase || !pendingPhone) return;
      if (!/^\d{6}$/.test(code.trim())) {
        setMessage('Enter the 6-digit SMS code.');
        return;
      }
      setMessage('');
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: pendingPhone,
          token: code.trim(),
          type: 'sms',
        });
        if (error) throw error;
        if (!data.session) throw new Error('No verified session');
      } catch (error) {
        setMessage(authErrorMessage(error, 'verify'));
      } finally {
        setCode('');
      }
    });
  }
  return (
    <AuthScreen
      title="Verify your mobile"
      description="Confirm your phone number to secure your account."
    >
      {pendingPhone ? (
        <AppText>Enter the SMS code sent to {pendingPhone}.</AppText>
      ) : (
        <AppInput
          label="Registered mobile number"
          value={phoneInput}
          onChangeText={setPhoneInput}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
      )}
      <AppInput
        label="SMS verification code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={6}
      />
      <Feedback message={message} />
      {!!notice && <AppText accessibilityLiveRegion="polite">{notice}</AppText>}
      <AppButton
        label="Verify mobile"
        loading={busy}
        disabled={!available || !pendingPhone}
        onPress={verify}
      />
      <AppButton
        label={remaining ? `Resend in ${remaining}s` : 'Resend SMS code'}
        disabled={!available || busy || remaining > 0}
        onPress={resend}
      />
      <AppText variant="caption" muted>
        The service controls code expiry and sending limits. The countdown is a
        reminder, not a guarantee that another SMS can be sent.
      </AppText>
      <TextAction
        label="Correct my number and restart registration"
        disabled={busy}
        onPress={() => {
          setPendingPhone('');
          setCode('');
          router.replace('/signup');
        }}
      />
      <AppText variant="caption" muted>
        Restarting does not change or verify the previous number. You’ll need to
        enter your password again.
      </AppText>
      <TextAction
        label="Back to Sign In"
        disabled={busy}
        onPress={() => router.replace('/login')}
      />
    </AuthScreen>
  );
}
