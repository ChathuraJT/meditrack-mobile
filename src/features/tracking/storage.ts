export type LocationSample = {
  client_record_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
  accuracy_m: number;
  data_mode: 'real';
};
export type StoredLocation = LocationSample & { uploaded_at?: string };
export const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const PREFIX = 'meditrack.tracking.v1.';
type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: string[]): Promise<void>;
};
export function validSample(value: LocationSample, now: number) {
  const time = Date.parse(value.recorded_at);
  return (
    Number.isFinite(time) &&
    time <= now &&
    time > now - RETENTION_MS &&
    Number.isFinite(value.latitude) &&
    Math.abs(value.latitude) <= 90 &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.longitude) <= 180 &&
    Number.isFinite(value.accuracy_m) &&
    value.accuracy_m >= 0 &&
    typeof value.client_record_id === 'string' &&
    value.data_mode === 'real'
  );
}
// Daily buckets avoid Android's per-entry size limit. Serialize mutations.
export function createTrackingStore(storage: Storage, account: string) {
  const prefix = `${PREFIX}${encodeURIComponent(account)}.`;
  let tail: Promise<unknown> = Promise.resolve();
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const result = tail.then(work);
    tail = result.catch(() => {});
    return result;
  }
  async function read(key: string): Promise<StoredLocation[]> {
    const raw = await storage.getItem(key);
    if (!raw) return [];
    const rows: unknown = JSON.parse(raw);
    if (!Array.isArray(rows))
      throw new Error('Local location storage could not be read.');
    return rows;
  }
  return {
    pending: (limit = 500, now = Date.now()) =>
      serial(async () => {
        const records: StoredLocation[] = [];
        for (const key of (await storage.getAllKeys())
          .filter((key) => key.startsWith(`${prefix}day.`))
          .sort()) {
          records.push(
            ...(await read(key)).filter(
              (row) => row && validSample(row, now) && !row.uploaded_at,
            ),
          );
          if (records.length >= limit) break;
        }
        return records.slice(0, limit);
      }),
    acknowledge: (ids: string[], at: string) =>
      serial(async () => {
        const accepted = new Set(ids);
        for (const key of (await storage.getAllKeys()).filter((key) =>
          key.startsWith(`${prefix}day.`),
        )) {
          const rows = await read(key);
          if (rows.some((row) => accepted.has(row.client_record_id)))
            await storage.setItem(
              key,
              JSON.stringify(
                rows.map((row) =>
                  accepted.has(row.client_record_id)
                    ? { ...row, uploaded_at: at }
                    : row,
                ),
              ),
            );
        }
        await storage.setItem(`${prefix}last-upload`, at);
      }),
    pendingOff: () =>
      serial(
        async () => (await storage.getItem(`${prefix}pending-off`)) === 'true',
      ),
    setPendingOff: (value: boolean) =>
      serial(() => storage.setItem(`${prefix}pending-off`, String(value))),
    append: (sample: LocationSample, now = Date.now()) =>
      serial(async () => {
        if (!validSample(sample, now))
          throw new Error(
            'Location has an invalid time, coordinate or accuracy.',
          );
        const key = `${prefix}day.${sample.recorded_at.slice(0, 10)}`;
        const rows = (await read(key)).filter((row) => validSample(row, now));
        if (
          !rows.some((row) => row.client_record_id === sample.client_record_id)
        )
          rows.push(sample);
        await storage.setItem(key, JSON.stringify(rows));
      }),
    summary: (now = Date.now()) =>
      serial(async () => {
        let count = 0;
        let pendingCount = 0;
        let latest: LocationSample | null = null;
        const keys = (await storage.getAllKeys()).filter(
          (key) => key.startsWith(PREFIX) && key.includes('.day.'),
        );
        for (const key of keys) {
          const rows = await read(key);
          const kept = rows.filter((row) => row && validSample(row, now));
          if (!kept.length) await storage.multiRemove([key]);
          else if (rows.length !== kept.length)
            await storage.setItem(key, JSON.stringify(kept));
          if (key.startsWith(`${prefix}day.`)) {
            count += kept.length;
            pendingCount += kept.filter((row) => !row.uploaded_at).length;
            for (const row of kept)
              if (!latest || row.recorded_at > latest.recorded_at) latest = row;
          }
        }
        return {
          count,
          latest,
          pendingCount,
          lastUpload: await storage.getItem(`${prefix}last-upload`),
        };
      }),
    clear: () =>
      serial(async () => {
        const keys = (await storage.getAllKeys()).filter((key) =>
          key.startsWith(`${prefix}day.`),
        );
        await storage.multiRemove(keys);
      }),
  };
}
export type TrackingStore = ReturnType<typeof createTrackingStore>;
