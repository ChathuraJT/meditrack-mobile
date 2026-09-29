import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export function useSupabaseLifecycle() {
  useEffect(() => {
    if (!supabase || Platform.OS === 'web') return;
    const client = supabase;
    const update = (state: string) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    };
    update(AppState.currentState);
    const subscription = AppState.addEventListener('change', update);
    return () => {
      subscription.remove();
      client.auth.stopAutoRefresh();
    };
  }, []);
}
