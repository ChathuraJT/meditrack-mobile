import { z } from 'zod';
const required = 'Please fill in all required fields.';
const field = (max: number) => z.string().trim().min(1, required).max(max);
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .email('Enter the email address for your account.'),
  password: z.string().min(1, 'Enter your password.'),
});
export const signupSchema = z
  .object({
    username: field(150),
    email: field(254).email('Enter a valid email address.'),
    password: z
      .string()
      .min(
        6,
        'Use at least 6 characters. The server may require a stronger password.',
      ),
    confirmPassword: z.string(),
    phone: field(15),
    NIC_number: field(12),
    birthday: field(10).refine(
      (v) =>
        /^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v,
      'Enter a valid birthday as YYYY-MM-DD.',
    ),
    role: z.enum(['patient', 'doctor', 'lab']),
    degrees: z.string().trim().max(100),
    university: z.string().trim().max(100),
    working_hospital: z.string().trim().max(150),
    lab_name: z.string().trim().max(150),
    lab_address: z.string().trim().max(255),
    license_id: z.string().trim().max(50),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.confirmPassword)
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
      });
    if (v.role === 'lab')
      for (const key of ['lab_name', 'lab_address', 'license_id'] as const)
        if (!v[key])
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: 'Please fill in all laboratory details.',
          });
  });
export type SignupValues = z.infer<typeof signupSchema>;
export const emptySignup: SignupValues = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  NIC_number: '',
  birthday: '',
  role: 'patient',
  degrees: '',
  university: '',
  working_hospital: '',
  lab_name: '',
  lab_address: '',
  license_id: '',
};
export function signupPayload(values: SignupValues) {
  const { confirmPassword: _confirmation, ...payload } =
    signupSchema.parse(values);
  if (payload.role !== 'doctor') {
    payload.degrees = '';
    payload.university = '';
    payload.working_hospital = '';
  }
  if (payload.role !== 'lab') {
    payload.lab_name = '';
    payload.lab_address = '';
    payload.license_id = '';
  }
  const now = new Date().toISOString();
  return { ...payload, created_at: now, updated_at: now };
}
export type UserProfile = import('./supabase-auth').AccountProfile;
export function launchDestination(
  initializing: boolean,
  profile: UserProfile | null,
  onboarded: boolean,
) {
  if (initializing) return 'loading';
  if (profile && profile.approval_status === 'approved')
    return profile.role === 'patient' ? 'patient' : 'unsupported';
  return onboarded ? 'login' : 'onboarding';
}
export function signupOutcome(
  role: SignupValues['role'],
  needsConfirmation = true,
) {
  return {
    redirect: !needsConfirmation && role !== 'doctor',
    message: needsConfirmation
      ? 'Registration received. Check your email to confirm your account, then sign in.' +
        (role === 'doctor'
          ? ' Doctor accounts also need administrator approval.'
          : '')
      : role === 'doctor'
        ? 'Registration submitted for administrator approval. Sign in after approval.'
        : 'Account created successfully! Redirecting to login...',
  };
}
export function authErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.';
}
