import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export function getApiBaseUrl(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const envUrl =
        process.env.EXPO_PUBLIC_WEB_API_URL ||
        process.env.EXPO_PUBLIC_DJANGO_API_URL ||
        process.env.EXPO_PUBLIC_API_BASE_URL;
      let port = '8000';
      if (envUrl) {
        try {
          const parsed = new URL(envUrl);
          if (parsed.port) port = parsed.port;
        } catch {}
      }
      return `${window.location.protocol}//${window.location.hostname}:${port}`;
    }
    return (
      process.env.EXPO_PUBLIC_WEB_API_URL ||
      process.env.EXPO_PUBLIC_DJANGO_API_URL ||
      'http://localhost:8000'
    );
  }
  const envUrl = process.env.EXPO_PUBLIC_DJANGO_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL;
  const lanUrl = process.env.EXPO_PUBLIC_LAN_API_URL || '';
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }
  return lanUrl;
}

export const apiConfigured = !!getApiBaseUrl();

export const SESSION_TOKEN_KEY = 'meditrack_session_token';
export const SESSION_EXPIRY_KEY = 'meditrack_session_expiry';

export async function getSessionToken() {
  if (Platform.OS === 'web') {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
}

export async function setSessionToken(token: string, expiresAt?: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    if (expiresAt) {
      localStorage.setItem(SESSION_EXPIRY_KEY, expiresAt);
    }
  } else {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    if (expiresAt) {
      await SecureStore.setItemAsync(SESSION_EXPIRY_KEY, expiresAt);
    }
  }
}

export async function clearSessionToken() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
  } else {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    await SecureStore.deleteItemAsync(SESSION_EXPIRY_KEY);
  }
}

class ApiError extends Error {
  status?: number;
  data?: any;
  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const baseUrl = getApiBaseUrl().trim().replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('API Base URL is not configured. Please set EXPO_PUBLIC_DJANGO_API_URL.');
  }

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const method = (options.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    // Django rotates CSRF tokens at login. Fetch the current token before writes.
    const session = await apiFetch('/session/');
    if (!session?.csrfToken) throw new ApiError('Unable to initialize a secure session.');
    headers.set('X-CSRFToken', session.csrfToken);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.status === 401) {
      // Return 401 error directly to be handled by caller (like AuthProvider)
      const errData = await response.json().catch(() => ({}));
      throw new ApiError('Unauthorized', response.status, errData);
    }

    if (!response.ok) {
      let data;
      try {
        data = await response.json();
      } catch {
        throw new ApiError(`Server returned ${response.status}`, response.status);
      }
      throw new ApiError(data?.error || `Error ${response.status}`, response.status, data);
    }

    // Handle empty response (like 204 or logout)
    const text = await response.text();
    if (!text) return null;
    
    try {
      return JSON.parse(text);
    } catch {
      throw new ApiError('Invalid JSON response from server');
    }
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408);
    }
    if (error instanceof TypeError) {
      throw new ApiError('Network request failed. Check your connection.', 0);
    }
    throw error;
  }
}
