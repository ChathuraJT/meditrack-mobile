import type { SupabaseClient } from '@supabase/supabase-js';

export type AccountProfile = {
  id: string;
  username: string;
  role: 'patient' | 'doctor' | 'lab' | 'admin';
  approval_status: 'approved' | 'pending' | 'rejected';
  doctorID: string | null;
  lab_name: string | null;
  license_id: string | null;
  lab_address: string | null;
  legacy_user_id: number | null;
};
export type Registration = {
  username: string;
  email: string;
  password: string;
  phone: string;
  birthday: string;
  role: 'patient' | 'doctor' | 'lab';
  NIC_number: string;
  degrees: string;
  university: string;
  working_hospital: string;
  lab_name: string;
  lab_address: string;
  license_id: string;
};
export function registrationRequest(input: Registration) {
  const { password, email, ...fields } = input;
  // Explicit allowlist: privilege/approval/legacy IDs cannot be supplied in metadata.
  return {
    email: email.trim(),
    password,
    options: {
      data: {
        username: fields.username.trim(),
        phone: fields.phone.trim(),
        birthday: fields.birthday,
        requested_role: fields.role,
        NIC_number: fields.NIC_number.trim(),
        degrees: fields.role === 'doctor' ? fields.degrees.trim() : '',
        university: fields.role === 'doctor' ? fields.university.trim() : '',
        working_hospital:
          fields.role === 'doctor' ? fields.working_hospital.trim() : '',
        lab_name: fields.role === 'lab' ? fields.lab_name.trim() : '',
        lab_address: fields.role === 'lab' ? fields.lab_address.trim() : '',
        license_id: fields.role === 'lab' ? fields.license_id.trim() : '',
      },
    },
  };
}
export function parseAccountProfile(value: unknown): AccountProfile {
  if (!value || typeof value !== 'object')
    throw new Error(
      'Your account profile is unavailable. Contact the team to finish account migration.',
    );
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== 'string' ||
    typeof v.username !== 'string' ||
    !v.username.trim() ||
    !['patient', 'doctor', 'lab', 'admin'].includes(String(v.role)) ||
    !['approved', 'pending', 'rejected'].includes(String(v.approval_status)) ||
    !['doctorID', 'lab_name', 'license_id', 'lab_address'].every(
      (k) => v[k] === null || typeof v[k] === 'string',
    ) ||
    !(
      v.legacy_user_id === null ||
      (Number.isSafeInteger(v.legacy_user_id) && Number(v.legacy_user_id) > 0)
    )
  )
    throw new Error('The account profile is invalid. Contact support.');
  return {
    id: v.id,
    username: v.username,
    role: v.role,
    approval_status: v.approval_status,
    doctorID: v.doctorID,
    lab_name: v.lab_name,
    license_id: v.license_id,
    lab_address: v.lab_address,
    legacy_user_id: v.legacy_user_id,
  } as AccountProfile;
}
export function assertApproved(profile: AccountProfile) {
  if (profile.approval_status === 'pending')
    throw new Error('Your account is pending administrator approval.');
  if (profile.approval_status === 'rejected')
    throw new Error(
      'Your registration was not approved. Please contact the team.',
    );
}
export async function currentAccount(
  client: SupabaseClient,
): Promise<AccountProfile | null> {
  const { data: sessionData, error: sessionError } =
    await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData.user?.email_confirmed_at)
    throw new Error('Confirm your email before signing in.');
  const { data, error } = await client
    .from('meditrack_accounts')
    .select(
      'id,username,role,approval_status,doctorID,lab_name,license_id,lab_address,legacy_user_id',
    )
    .eq('id', userData.user.id)
    .single();
  if (error)
    throw new Error(
      'Your account profile could not be loaded. Check your connection or contact the team to finish account migration.',
    );
  const profile = parseAccountProfile(data);
  if (profile.id !== userData.user.id)
    throw new Error('Account identity mismatch. Please sign in again.');
  assertApproved(profile);
  return profile;
}
export async function registerAccount(
  client: SupabaseClient,
  input: Registration,
) {
  const { data, error } = await client.auth.signUp(registrationRequest(input));
  if (error) throw error;
  if (data.session) await client.auth.signOut({ scope: 'local' });
  return { needsConfirmation: !data.session };
}
export async function signOutAccount(client: SupabaseClient) {
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw error;
}
