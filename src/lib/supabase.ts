import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabaseConfiguration } from '@/config/env';
import { sessionStorage } from './session-storage';

const config = supabaseConfiguration.config;
export const supabase = config
  ? createClient(config.url, config.publishableKey, {
      auth: {
        ...(Platform.OS !== 'web'
          ? { storage: sessionStorage, lock: processLock }
          : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
