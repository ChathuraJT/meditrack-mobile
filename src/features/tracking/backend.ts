import { apiFetch } from '@/lib/api';
import type { LocationSample } from './storage';

export function uploadLocations(
  userId: number,
  samples: LocationSample[],
  signal: AbortSignal,
) {
  return apiFetch('/api/exposure/locations/', {
    method: 'POST',
    expectedUserId: userId,
    signal,
    body: JSON.stringify({
      samples: samples.map(
        ({
          client_record_id,
          latitude,
          longitude,
          recorded_at,
          accuracy_m,
          data_mode,
        }) => ({
          client_record_id,
          latitude,
          longitude,
          recorded_at,
          accuracy_m,
          data_mode,
        }),
      ),
    }),
  });
}

export type Analysis = {
  id: number;
  disease_code: string;
  analysed_at: string;
  model_score: number | null;
  model_version: string;
  exposure_summary: string | Record<string, unknown>;
};

export async function loadLocations(
  userId: number,
  signal: AbortSignal,
): Promise<LocationSample[]> {
  const rows = await apiFetch('/api/exposure/locations/?data_mode=real', {
    expectedUserId: userId,
    signal,
  });
  if (
    !Array.isArray(rows) ||
    rows.some(
      (row) =>
        !row ||
        row.data_mode !== 'real' ||
        typeof row.client_record_id !== 'string' ||
        !Number.isFinite(row.latitude) ||
        !Number.isFinite(row.longitude) ||
        !Number.isFinite(row.accuracy_m) ||
        !Number.isFinite(Date.parse(row.recorded_at)),
    )
  )
    throw new Error('Unexpected location history response.');
  return rows;
}

export async function loadAnalyses(
  userId: number,
  signal: AbortSignal,
): Promise<Analysis[]> {
  const rows = await apiFetch('/api/exposure/analyses/?data_mode=real', {
    expectedUserId: userId,
    signal,
  });
  if (
    !Array.isArray(rows) ||
    rows.some(
      (row) =>
        !row ||
        row.data_mode !== 'real' ||
        typeof row.disease_code !== 'string' ||
        !Number.isFinite(Date.parse(row.analysed_at)) ||
        (row.model_score != null &&
          (row.model_score === '' ||
            !Number.isFinite(Number(row.model_score)))),
    )
  )
    throw new Error('Unexpected analysis response.');
  return rows.map((row) => ({
    ...row,
    model_score: row.model_score == null ? null : Number(row.model_score),
  }));
}

export function analysisScore(score: number | null) {
  return score == null ? 'Not calculated yet' : `Model score: ${score}`;
}
