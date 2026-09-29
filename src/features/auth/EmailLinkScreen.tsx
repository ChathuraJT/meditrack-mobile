import { useState } from 'react';
import { router } from 'expo-router';
import { z } from 'zod';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { authErrorMessage } from './model';
import {
  AuthScreen,
  Feedback,
  TextAction,
  useSubmission,
  useCooldown,
} from './components';
export function EmailLinkScreen() {
  const { session, draft, setDraft } = useAuth();
  const [email, setEmail] = useState(
    session?.user.new_email || draft.email || '',
  );
  const [target, setTarget] = useState(session?.user.new_email || '');
  const [code, setCode] = useState('');
  const [sentAt, setSentAt] = useState(0);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const { busy, run } = useSubmission();
  const cooldown = useCooldown(sentAt);
  const confirmed =
    !!session?.user.email &&
    !!session.user.email_confirmed_at &&
    !session.user.new_email;
  function continueToApp() {
    setDraft({ ...draft, email: '' });
    router.replace('/');
  }
  async function send() {
    await run(async () => {
      if (!supabase || cooldown > 0) return;
      const parsed = z.email().safeParse(email.trim());
      if (!parsed.success) {
        setMessage('Enter a valid email address.');
        return;
      }
      setMessage('');
      setNotice('');
      try {
        const { error } = await supabase.auth.updateUser({
          email: parsed.data,
        });
        if (error) throw error;
        setTarget(parsed.data);
        setSentAt(Date.now());
        setDraft({ ...draft, email: '' });
        setNotice(
          'Check your email for a verification code. If changing an existing email, confirmation may be required at both addresses.',
        );
      } catch (error) {
        setMessage(authErrorMessage(error, 'email'));
      }
    });
  }
  async function verify() {
    await run(async () => {
      if (!supabase || !target) return;
      if (!/^\d{6}$/.test(code.trim())) {
        setMessage('Enter the 6-digit code from your email.');
        return;
      }
      setMessage('');
      setNotice('');
      try {
        const userId = session!.user.id;
        const { error } = await supabase.auth.verifyOtp({
          email: target,
          token: code.trim(),
          type: 'email_change',
        });
        if (error) throw error;
        const { data, error: refreshError } = await supabase.auth.getUser();
        if (refreshError) throw refreshError;
        if (data.user.id !== userId) {
          await supabase.auth.signOut({ scope: 'local' });
          throw new Error('Account mismatch');
        }
        if (
          data.user.email?.toLowerCase() === target.toLowerCase() &&
          data.user.email_confirmed_at &&
          !data.user.new_email
        ) {
          // Refresh the provider's user snapshot through the supported auth event.
          const { error: sessionError } = await supabase.auth.refreshSession();
          if (sessionError) throw sessionError;
          setTarget('');
          setNotice(
            'Email verified. You can now use this email or your phone with the same password.',
          );
        } else
          setNotice(
            'Code accepted. Complete any remaining confirmation sent to your other email address.',
          );
      } catch (error) {
        setMessage(authErrorMessage(error, 'email'));
      } finally {
        setCode('');
      }
    });
  }
  async function resend() {
    await run(async () => {
      if (!supabase || !target || cooldown > 0) return;
      setMessage('');
      try {
        const { error } = await supabase.auth.resend({
          type: 'email_change',
          email: target,
        });
        if (error) throw error;
        setNotice(
          'A new verification email was requested. Use the latest code.',
        );
      } catch (error) {
        setMessage(authErrorMessage(error, 'email'));
      } finally {
        setSentAt(Date.now());
      }
    });
  }
  return (
    <AuthScreen
      title="Add an email"
      description="An optional way to sign in to your existing phone account."
    >
      {confirmed && <AppText>Email verified: {session?.user.email}</AppText>}
      <AppText muted>
        Your phone and password remain usable. Email sign-in becomes available
        after email verification.
      </AppText>
      {!confirmed && (
        <>
          <AppInput
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!busy}
          />
          <AppButton
            label={
              cooldown
                ? `Send code in ${cooldown}s`
                : 'Send email verification code'
            }
            loading={busy}
            disabled={cooldown > 0}
            onPress={send}
          />
          {!!target && (
            <>
              <AppText>Verify the code for {target}.</AppText>
              <AppInput
                label="Email verification code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
              />
              <AppButton label="Verify email" loading={busy} onPress={verify} />
              <TextAction
                label={
                  cooldown ? `Resend in ${cooldown}s` : 'Resend email code'
                }
                disabled={busy || cooldown > 0}
                onPress={resend}
              />
            </>
          )}
        </>
      )}
      <Feedback message={message} />
      {!!notice && <AppText accessibilityLiveRegion="polite">{notice}</AppText>}
      <AppText variant="caption" muted>
        Email verification is optional. Server expiry and rate limits apply. You
        can return here from More at any time.
      </AppText>
      <TextAction
        label={
          confirmed ? 'Continue to MediTrack' : 'Continue and verify later'
        }
        disabled={busy}
        onPress={continueToApp}
      />
    </AuthScreen>
  );
}
