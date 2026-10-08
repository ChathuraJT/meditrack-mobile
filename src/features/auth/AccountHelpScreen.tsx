import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { enrollmentClient } from '@/lib/supabase';
import {
  AuthScreen,
  Feedback,
  TextAction,
  useSubmission,
  useCooldown,
  formStyles,
} from './components';
import { authErrorMessage } from './model';
export function AccountHelpScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [message, setMessage] = useState('');
  const [sentAt, setSentAt] = useState(0);
  const { busy, run } = useSubmission();
  const remaining = useCooldown(sentAt);
  async function send() {
    await run(async () => {
      if (!enrollmentClient || remaining) return;
      setMessage('');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setMessage('Enter a valid email address.');
        return;
      }
      try {
        const { error } = recovery
          ? await enrollmentClient.auth.resetPasswordForEmail(email.trim())
          : await enrollmentClient.auth.resend({
              type: 'signup',
              email: email.trim(),
            });
        if (error) throw error;
        setSentAt(Date.now());
        setMessage(
          'If your account is eligible, an email has been sent. Use the code from that email.',
        );
      } catch (e) {
        setMessage(authErrorMessage(e));
      }
    });
  }
  async function verify() {
    await run(async () => {
      if (!enrollmentClient) return;
      setMessage('');
      if (!email.trim() || !/^\d{6,10}$/.test(code.trim())) {
        setMessage('Enter your email and the confirmation code.');
        return;
      }
      if (recovery && password.length < 6) {
        setMessage('Use at least 6 characters for your new password.');
        return;
      }
      try {
        const { error } = await enrollmentClient.auth.verifyOtp({
          email: email.trim(),
          token: code.trim(),
          type: recovery ? 'recovery' : 'signup',
        });
        if (error) throw error;
        if (recovery) {
          const { error: updateError } = await enrollmentClient.auth.updateUser(
            { password },
          );
          if (updateError) throw updateError;
        }
        await enrollmentClient.auth.signOut({ scope: 'local' });
        setMessage(
          recovery
            ? 'Password updated. Return to sign in.'
            : 'Email confirmed. Return to sign in. Doctors still need administrator approval.',
        );
        setCode('');
      } catch (e) {
        setMessage(authErrorMessage(e));
      } finally {
        setPassword('');
        await enrollmentClient.auth.signOut({ scope: 'local' });
      }
    });
  }
  return (
    <AuthScreen
      title={recovery ? 'Reset your password' : 'Confirm your email'}
      description="Use the email address registered with MediTrack."
    >
      <View style={formStyles.stack}>
        <AppInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!busy}
        />
        <AppButton
          label={remaining ? `Send again in ${remaining}s` : 'Send email code'}
          disabled={remaining > 0 || !enrollmentClient}
          loading={busy}
          onPress={send}
        />
        <AppInput
          label="Email code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          maxLength={10}
          editable={!busy}
        />
        {recovery && (
          <AppInput
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            editable={!busy}
          />
        )}
        <AppButton
          label={recovery ? 'Set new password' : 'Confirm email'}
          disabled={!enrollmentClient}
          loading={busy}
          onPress={verify}
        />
        <Feedback message={message} />
        <AppText variant="caption" muted>
          Existing web accounts must be migrated before they can sign in here.
          After migration, use Reset password to choose your Supabase password.
        </AppText>
        <TextAction
          label={
            recovery
              ? 'Confirm a new account instead'
              : 'Reset an existing account password'
          }
          disabled={busy}
          onPress={() => {
            setRecovery(!recovery);
            setCode('');
            setPassword('');
            setMessage('');
          }}
        />
        <TextAction
          label="Back to sign in"
          disabled={busy}
          onPress={() => router.replace('/login')}
        />
      </View>
    </AuthScreen>
  );
}
