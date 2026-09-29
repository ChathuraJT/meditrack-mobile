import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { profileSchema, type ProfileValues } from './model';
export type PatientProfile = {
  id: string;
  full_name: string;
  age_at_registration: number;
  age_recorded_at: string;
  gender: string;
  created_at: string;
  updated_at: string;
};
export async function createProfile(
  values: ProfileValues,
  signal?: AbortSignal,
): Promise<PatientProfile> {
  if (!supabase) throw new Error('Authentication unavailable');
  const request = supabase.rpc('ensure_patient_profile', {
    p_full_name: values.full_name,
    p_age: Number(values.age),
    p_gender: values.gender,
  });
  const { data, error } = await (signal
    ? request.abortSignal(signal)
    : request);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Profile unavailable');
  return row as PatientProfile;
}
export function usePatientProfile() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['patient-profile', session?.user.id],
    enabled: !!session?.user.phone_confirmed_at,
    retry: false,
    staleTime: 60000,
    queryFn: async ({ signal }) => {
      if (!supabase || !session) throw new Error('Session required');
      const { data, error } = await supabase
        .from('patient_profiles')
        .select(
          'id, full_name, age_at_registration, age_recorded_at, gender, created_at, updated_at',
        )
        .eq('id', session.user.id)
        .abortSignal(signal)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as PatientProfile;
      const meta = session.user.user_metadata;
      const parsed = profileSchema.safeParse({
        full_name: meta.full_name,
        age: String(meta.age_at_registration ?? ''),
        gender: meta.gender,
      });
      // Idempotent, authenticated creation after verification, including next login.
      return parsed.success ? createProfile(parsed.data, signal) : null;
    },
  });
}
