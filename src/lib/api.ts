export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}
export async function postJson(
  baseUrl: string | null,
  path: string,
  payload: unknown,
  timeoutMs = 15000,
): Promise<unknown> {
  if (!baseUrl)
    throw new ApiError('Configure the MediTrack API URL before signing in.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const body =
        data && typeof data === 'object'
          ? (data as Record<string, unknown>)
          : {};
      const message = [body.error, body.message].find(
        (v) => typeof v === 'string' && v.trim() && !/<[^>]+>/.test(v),
      );
      throw new ApiError(
        typeof message === 'string'
          ? message
          : `Request failed (${response.status}). Please try again.`,
        response.status,
      );
    }
    if (!data || typeof data !== 'object')
      throw new ApiError(
        'The server returned an unexpected response. Please try again.',
      );
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      controller.signal.aborted
        ? 'The request timed out. Please try again.'
        : 'Unable to reach MediTrack. Check your connection and try again.',
    );
  } finally {
    clearTimeout(timer);
  }
}
