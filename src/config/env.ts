import 'react-native-url-polyfill/auto';
export function readSupabaseConfiguration(
  url: string | undefined,
  key: string | undefined,
) {
  if (!url || !key) return null;
  try {
    const parsed = new URL(url.trim());
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== '/'
    )
      return null;
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key.trim())) return null;
    return { url: parsed.origin, publishableKey: key.trim() };
  } catch {
    return null;
  }
}
export const supabaseConfiguration = readSupabaseConfiguration(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
