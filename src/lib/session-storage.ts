import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupportedStorage } from '@supabase/supabase-js';

// Auth sessions only. AsyncStorage is not encrypted; review before real patient use.
// Isolated here so secure storage can replace it without changing feature code.
export const sessionStorage: SupportedStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
