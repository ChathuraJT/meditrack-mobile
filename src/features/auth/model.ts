import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import { z } from 'zod';

export const genders = [
  'Female',
  'Male',
  'Other',
  'Prefer not to say',
] as const;
export function normalizePhone(value: string, country: CountryCode = 'LK') {
  const phone = parsePhoneNumberFromString(value.trim(), {
    defaultCountry: country,
    extract: false,
  });
  return phone?.isValid() && !phone.ext ? phone.number : null;
}
export function parseIdentifier(
  value: string,
): { email: string } | { phone: string } | null {
  const identifier = value.trim();
  if (identifier.includes('@'))
    return z.email().safeParse(identifier).success
      ? { email: identifier }
      : null;
  const phone = normalizePhone(identifier);
  return phone ? { phone } : null;
}
export const optionalEmail = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || z.email().safeParse(value).success,
    'Enter a valid email address.',
  );
export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters.')
    .max(100, 'Use 100 characters or fewer.'),
  age: z
    .string()
    .regex(/^\d{1,3}$/, 'Enter a whole number from 1 to 120.')
    .refine(
      (value) => Number(value) >= 1 && Number(value) <= 120,
      'Enter an age from 1 to 120.',
    ),
  gender: z.enum(genders, { error: 'Select a gender option.' }),
});
export const signupSchema = profileSchema
  .extend({
    email: optionalEmail,
    country: z.string(),
    phone: z.string().min(1, 'Enter your mobile number.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .superRefine((values, ctx) => {
    if (!normalizePhone(values.phone, values.country as CountryCode))
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'Enter a valid mobile number for the selected country.',
      });
    if (values.password !== values.confirmPassword)
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords must match exactly.',
      });
  });
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Enter your email or mobile number.')
    .refine(
      (value) => !!parseIdentifier(value),
      'Enter a valid email or phone number (Sri Lanka by default, or use +country code).',
    ),
  password: z.string().min(1, 'Enter your password.'),
});
export type SignupValues = z.infer<typeof signupSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type RegistrationDraft = Omit<
  SignupValues,
  'password' | 'confirmPassword'
>;
export const emptyDraft: RegistrationDraft = {
  full_name: '',
  age: '',
  gender: '' as SignupValues['gender'],
  email: '',
  country: 'LK',
  phone: '',
};
export type AuthStatus = 'initializing' | 'signedOut' | 'signedIn' | 'error';
export function launchDestination(
  initializing: boolean,
  hasSession: boolean,
  onboarded: boolean,
) {
  if (initializing) return 'loading';
  if (hasSession) return 'patient';
  return onboarded ? 'login' : 'onboarding';
}
export function authErrorMessage(
  error: unknown,
  context: 'login' | 'signup' | 'verify' | 'email' | 'general' = 'general',
) {
  const e = error as { status?: number; code?: string; name?: string };
  if (e?.status === 429 || e?.code?.includes('rate_limit'))
    return 'Too many attempts. Wait before trying again; the server controls the retry window.';
  if (e?.name === 'AuthRetryableFetchError' || e instanceof TypeError)
    return 'Unable to reach the service. Check your connection and try again.';
  if (e?.code === 'phone_provider_disabled' || e?.code === 'sms_send_failed')
    return 'Phone verification is unavailable. Please try later or contact the MediTrack team.';
  if (e?.code === 'weak_password')
    return 'This password does not meet the server’s password policy. Use a longer, stronger password and try again.';
  if (context === 'login')
    return 'Unable to sign in. Check your credentials and confirm your account, then try again.';
  if (context === 'verify')
    return 'The code could not be verified. Check it or request a new code if it has expired.';
  if (context === 'email')
    return 'This email could not be linked or verified. Try another address or continue with your phone account.';
  if (context === 'signup')
    return 'Account creation could not be completed. Check your details, try signing in if you already registered, or try again later.';
  return 'The request could not be completed. Please try again.';
}
