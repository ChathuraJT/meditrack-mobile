import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabaseConfiguration as config } from '@/config/env';
// AsyncStorage holds the SDK session, never user passwords. The legacy profile cache is ignored.
export const supabase = config
  ? createClient(config.url, config.publishableKey, {
      auth: {
        ...(Platform.OS !== 'web'
          ? { storage: AsyncStorage, lock: processLock }
          : {}),
        storageKey: 'meditrack.supabase.session.v2',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
// Confirmation/recovery must not open patient screens before explicitly signing in.
export const enrollmentClient = config
  ? createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'meditrack.enrollment.v2',
      },
    })
  : null;
