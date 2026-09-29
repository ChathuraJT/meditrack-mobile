import 'react-native-url-polyfill/auto';

type Configuration = { url: string; publishableKey: string };
type Result =
  { config: Configuration; message: null } | { config: null; message: string };

function readConfiguration(): Result {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const invalid: Result = {
    config: null,
    message:
      'Supabase is not configured. Copy .env.example to .env and set the project HTTPS URL and sb_publishable_ key. Restart Expo after editing. The shell works without a backend.',
  };
  if (!url || !publishableKey) return invalid;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' ||
      !parsed.hostname.includes('.') ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== '/'
    )
      return invalid;
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) return invalid;
    return { config: { url: parsed.origin, publishableKey }, message: null };
  } catch {
    return invalid;
  }
}
// Format validation is not a connectivity or authorization check.
export const supabaseConfiguration = readConfiguration();
