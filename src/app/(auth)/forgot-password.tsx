import { View, StyleSheet } from 'react-native';
import { useColorScheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import { AuthScreen, TextAction, formStyles } from '@/features/auth/components';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { spacing, useThemeColors } from '@/theme/tokens';
import { useState } from 'react';

export default function ForgotPasswordScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const isDark = useColorScheme() === 'dark';
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <AuthScreen
      title="Reset Password"
      description="Enter your registered username, email, or mobile number to receive password reset instructions."
    >
      <View style={formStyles.stack}>
        <AppCard>
          <View style={formStyles.stack}>
            {submitted ? (
              <View style={styles.confirmation}>
                <AppText
                  style={[
                    styles.confirmTitle,
                    { color: isDark ? '#38BDF8' : colors.primary },
                  ]}
                >
                  Check your inbox
                </AppText>

                <AppText muted style={styles.confirmText}>
                  If an account exists for {emailOrPhone}, we have sent password
                  reset instructions.
                </AppText>
              </View>
            ) : (
              <>
                <AppInput
                  label="Email or Username"
                  value={emailOrPhone}
                  onChangeText={setEmailOrPhone}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <AppButton
                  label="Send Reset Link"
                  disabled={!emailOrPhone.trim()}
                  onPress={() => setSubmitted(true)}
                />
              </>
            )}
          </View>
        </AppCard>
        <TextAction
          label="Back to Sign In"
          onPress={() => router.replace('/login')}
        />
      </View>
    </AuthScreen>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    confirmation: {
      paddingVertical: spacing.md,
      gap: spacing.sm,
      alignItems: 'center',
    },
    confirmTitle: {
      fontWeight: '600',
      fontSize: 18,
      color: colors.primary,
      textAlign: 'center',
    },
    confirmText: {
      textAlign: 'center',
    },
  });
