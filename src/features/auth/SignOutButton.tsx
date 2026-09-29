import { useState } from 'react';
import { AppButton } from '@/components/ui/AppButton';
import { useAuth } from './AuthProvider';
import { Feedback, useSubmission } from './components';
import { authErrorMessage } from './model';
export function SignOutButton({ disabled = false }: { disabled?: boolean }) {
  const { signOut } = useAuth();
  const { busy, run } = useSubmission();
  const [message, setMessage] = useState('');
  return (
    <>
      <Feedback message={message} />
      <AppButton
        label="Sign out"
        disabled={disabled}
        loading={busy}
        onPress={() =>
          run(async () => {
            setMessage('');
            try {
              await signOut();
            } catch (error) {
              setMessage(authErrorMessage(error));
            }
          })
        }
      />
    </>
  );
}
