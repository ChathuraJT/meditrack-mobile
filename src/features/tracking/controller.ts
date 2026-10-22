import type { LocationSample, TrackingStore } from './storage';
export type TrackingState = {
  ready: boolean;
  busy: boolean;
  enabled: boolean;
  foreground: boolean;
  consent: boolean | null;
  pendingOff: boolean;
  permission: string;
  count: number;
  latest: LocationSample | null;
  capturing: boolean;
  error: string | null;
  uploading: boolean;
  uploadError: string | null;
  pendingCount: number;
  lastUpload: string | null;
};
type Dependencies = {
  store: TrackingStore;
  consent(granted?: boolean): Promise<boolean>;
  permission(request: boolean): Promise<string>;
  capture(signal: AbortSignal): Promise<LocationSample>;
  upload?(
    samples: LocationSample[],
    signal: AbortSignal,
  ): Promise<{ created: number; duplicates: number }>;
};
export class TrackingController {
  private state: TrackingState = {
    ready: false,
    busy: false,
    enabled: false,
    foreground: true,
    consent: null,
    pendingOff: false,
    permission: 'undetermined',
    count: 0,
    latest: null,
    capturing: false,
    error: null,
    uploading: false,
    uploadError: null,
    pendingCount: 0,
    lastUpload: null,
  };
  private listeners = new Set<() => void>();
  private alive = true;
  private timer?: ReturnType<typeof setInterval>;
  private captureAbort?: AbortController;
  private uploadAbort?: AbortController;
  private lastAttempt = 0;
  private generation = 0;
  constructor(private deps: Dependencies) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<TrackingState>) {
    if (!this.alive) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private fail(error: unknown) {
    this.update({
      error:
        error instanceof Error
          ? error.message
          : 'Tracking could not be updated. Please retry.',
    });
  }
  async initialize() {
    try {
      this.update({
        pendingOff: await this.deps.store.pendingOff(),
        ...(await this.deps.store.summary()),
      });
      this.update({ permission: await this.deps.permission(false) });
    } catch (error) {
      this.fail(error);
      return;
    }
    this.update({ ready: true });
    await this.refreshConsent();
    if (this.alive)
      this.timer = setInterval(() => {
        void this.tick();
        void this.sync();
        if (this.state.pendingOff) void this.refreshConsent();
        void this.deps.store
          .summary()
          .then((summary) => this.update(summary))
          .catch((error) => this.fail(error));
      }, 60_000);
  }
  async refreshConsent() {
    if (!this.alive || this.state.busy) return;
    const generation = this.generation;
    const withdrawing = this.state.pendingOff;
    this.update({ busy: true, error: null });
    try {
      const granted = await this.deps.consent(withdrawing ? false : undefined);
      if (!this.alive || generation !== this.generation) return;
      if (withdrawing) {
        if (granted)
          throw new Error(
            'The server did not confirm consent withdrawal. Please retry.',
          );
        await this.deps.store.setPendingOff(false);
      }
      this.update({ consent: granted, pendingOff: false });
      if (!granted) this.pause();
    } catch (error) {
      this.fail(error);
    } finally {
      this.update({ busy: false });
      if (this.alive && this.state.pendingOff && !withdrawing)
        void this.refreshConsent();
    }
  }
  async start() {
    if (
      !this.alive ||
      !this.state.ready ||
      this.state.busy ||
      this.state.pendingOff
    )
      return;
    const generation = ++this.generation;
    this.update({ busy: true, error: null });
    try {
      const permission = await this.deps.permission(true);
      if (!this.alive || generation !== this.generation) return;
      this.update({ permission });
      if (permission !== 'granted')
        throw new Error(
          'Location permission is needed. Allow it in your device settings and try again.',
        );
      if (!(await this.deps.consent(true)))
        throw new Error('The server did not confirm tracking consent.');
      if (!this.alive || generation !== this.generation) return;
      this.update({ consent: true, enabled: true });
      this.lastAttempt = 0;
    } catch (error) {
      this.fail(error);
    } finally {
      this.update({ busy: false });
      if (this.alive && this.state.pendingOff) void this.refreshConsent();
    }
    await this.tick();
    await this.sync();
  }
  private pause() {
    this.generation++;
    this.captureAbort?.abort();
    this.uploadAbort?.abort();
    this.update({ enabled: false, capturing: false });
  }
  async stop() {
    this.pause();
    this.update({ pendingOff: true, error: null });
    try {
      await this.deps.store.setPendingOff(true);
    } catch (error) {
      this.fail(error);
      return;
    }
    await this.refreshConsent();
  }
  setForeground(active: boolean) {
    this.update({ foreground: active });
    if (!active) {
      this.captureAbort?.abort();
      this.uploadAbort?.abort();
    } else if (this.state.ready) {
      void this.tick();
      void this.refreshConsent();
      void this.sync();
    }
  }
  async tick() {
    if (
      !this.alive ||
      !this.state.foreground ||
      !this.state.enabled ||
      this.state.capturing ||
      this.state.pendingOff ||
      Date.now() - this.lastAttempt < 60_000
    )
      return;
    this.lastAttempt = Date.now();
    const generation = this.generation;
    const abort = new AbortController();
    this.captureAbort = abort;
    this.update({ capturing: true });
    try {
      const permission = await this.deps.permission(false);
      this.update({ permission });
      if (permission !== 'granted') {
        this.pause();
        this.update({
          error: 'Tracking paused because location permission was removed.',
        });
        return;
      }
      if (abort.signal.aborted || !this.alive) return;
      const sample = await this.deps.capture(abort.signal);
      if (
        !this.alive ||
        abort.signal.aborted ||
        generation !== this.generation ||
        !this.state.enabled
      )
        return;
      await this.deps.store.append(sample);
      this.update({ ...(await this.deps.store.summary()), error: null });
      void this.sync();
    } catch (error) {
      if (!abort.signal.aborted) this.fail(error);
    } finally {
      if (this.captureAbort === abort) {
        this.captureAbort = undefined;
        this.update({ capturing: false });
      }
    }
  }
  async sync() {
    if (
      !this.alive ||
      !this.deps.upload ||
      this.uploadAbort ||
      !this.state.enabled ||
      !this.state.foreground ||
      !this.state.consent ||
      this.state.pendingOff
    )
      return;
    const abort = new AbortController();
    this.uploadAbort = abort;
    this.update({ uploading: true, uploadError: null });
    try {
      // Bound each pass; remaining backlog resumes on the next minute or manual retry.
      for (let batch = 0; batch < 4; batch++) {
        const samples = await this.deps.store.pending(500);
        if (!samples.length || abort.signal.aborted || !this.alive) break;
        const result = await this.deps.upload(samples, abort.signal);
        if (abort.signal.aborted || !this.alive) break;
        if (
          !Number.isInteger(result?.created) ||
          !Number.isInteger(result?.duplicates) ||
          result.created < 0 ||
          result.duplicates < 0 ||
          result.created + result.duplicates !== samples.length
        )
          throw new Error(
            'The server did not confirm the whole batch. Records are kept for retry.',
          );
        await this.deps.store.acknowledge(
          samples.map((row) => row.client_record_id),
          new Date().toISOString(),
        );
        this.update(await this.deps.store.summary());
      }
    } catch (error) {
      if (!abort.signal.aborted)
        this.update({
          uploadError:
            error instanceof Error
              ? error.message
              : 'Upload failed. Records are kept for retry.',
        });
    } finally {
      this.uploadAbort = undefined;
      this.update({ uploading: false });
    }
  }
  async clearLocal() {
    if (this.state.enabled || this.state.busy || this.state.uploading) return;
    this.update({ busy: true });
    try {
      await this.deps.store.clear();
      this.update({ ...(await this.deps.store.summary()), error: null });
    } catch (error) {
      this.fail(error);
    } finally {
      this.update({ busy: false });
    }
  }
  dispose() {
    this.alive = false;
    this.generation++;
    clearInterval(this.timer);
    this.captureAbort?.abort();
    this.uploadAbort?.abort();
    this.listeners.clear();
  }
}
