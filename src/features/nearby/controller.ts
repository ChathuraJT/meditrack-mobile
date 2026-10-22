export type Advertisement = {
  id: string;
  name: string | null;
  rssi: number | null;
};
export type NearbyDevice = Advertisement & {
  lastSeen: number;
  strong: boolean;
};
export type Scanner = {
  start(
    onDevice: (device: Advertisement) => void,
    onError: (message: string) => void,
  ): Promise<void>;
  stop(): Promise<void>;
};
export type NearbyState = {
  scanning: boolean;
  starting: boolean;
  devices: NearbyDevice[];
  error: string | null;
  notice: string | null;
};
export class NearbyController {
  private state: NearbyState = {
    scanning: false,
    starting: false,
    devices: [],
    error: null,
    notice: null,
  };
  private listeners = new Set<() => void>();
  private generation = 0;
  private timer?: ReturnType<typeof setInterval>;
  private expiry?: ReturnType<typeof setTimeout>;
  private driver?: Scanner;
  private cleanup: Promise<void> = Promise.resolve();
  constructor(
    private createScanner: () => Scanner,
    private now = Date.now,
  ) {}
  getSnapshot = () => this.state;
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };
  private update(patch: Partial<NearbyState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((callback) => callback());
  }
  prune() {
    this.update({
      devices: this.state.devices.filter(
        (device) => this.now() - device.lastSeen < 15_000,
      ),
    });
  }
  async start() {
    if (this.state.starting || this.state.scanning) return;
    const generation = ++this.generation;
    const driver = this.createScanner();
    this.driver = driver;
    this.update({ starting: true, devices: [], error: null, notice: null });
    try {
      await this.cleanup;
      if (generation !== this.generation) return;
      await driver.start(
        (device) => {
          if (generation !== this.generation || !device.id) return;
          const previous = this.state.devices.find(
            (row) => row.id === device.id,
          );
          const rssi =
            device.rssi != null &&
            Number.isFinite(device.rssi) &&
            device.rssi < 0 &&
            device.rssi >= -127
              ? device.rssi
              : null;
          // This is a signal-strength hint, not a distance or exposure threshold.
          const strong =
            rssi !== null && rssi >= (previous?.strong ? -72 : -65);
          const row = { ...device, rssi, strong, lastSeen: this.now() };
          const devices = [
            ...this.state.devices.filter(
              (item) =>
                item.id !== device.id && this.now() - item.lastSeen < 15_000,
            ),
            row,
          ]
            .sort((a, b) => (b.rssi ?? -128) - (a.rssi ?? -128))
            .slice(0, 50);
          this.update({
            devices,
            ...(!previous
              ? {
                  notice: `BLE device detected: ${device.name || 'Unnamed device'}`,
                }
              : {}),
          });
        },
        (message) => {
          if (generation !== this.generation) return;
          this.stop();
          this.update({ error: message });
        },
      );
      if (generation !== this.generation) {
        await driver.stop();
        return;
      }
      this.update({ starting: false, scanning: true });
      this.timer = setInterval(() => this.prune(), 1000);
      this.expiry = setTimeout(
        () => this.stop('Scan finished. Tap Start to scan again.'),
        30_000,
      );
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop();
      this.update({
        error:
          error instanceof Error
            ? error.message
            : 'Unable to scan for nearby devices.',
      });
    }
  }
  stop(notice: string | null = null) {
    this.generation++;
    clearInterval(this.timer);
    clearTimeout(this.expiry);
    const driver = this.driver;
    this.driver = undefined;
    if (driver)
      this.cleanup = this.cleanup.then(() => driver.stop()).catch(() => {});
    this.update({ scanning: false, starting: false, devices: [], notice });
  }
}
