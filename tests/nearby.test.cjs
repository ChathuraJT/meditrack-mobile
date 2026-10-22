const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
function compile(file, mocks = {}) {
  const filename = path.resolve(file);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = (name) => (name in mocks ? mocks[name] : original(name));
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
  return loaded.exports;
}
const { NearbyController } = compile('src/features/nearby/controller.ts');
function setup(t, options = {}) {
  let device,
    failure,
    stops = 0,
    starts = 0;
  const controller = new NearbyController(
    () => ({
      start: async (onDevice, onError) => {
        starts++;
        device = onDevice;
        failure = onError;
        await options.pending;
      },
      stop: async () => {
        stops++;
      },
    }),
    options.now,
  );
  t.after(() => controller.stop());
  return {
    controller,
    emit: (row) => device(row),
    fail: (message) => failure(message),
    stops: () => stops,
    starts: () => starts,
  };
}
const ad = (id, rssi = -60) => ({ id, rssi, name: 'Test beacon' });
test('deduplicates advertisements, sorts signals, applies hysteresis and expires stale devices', async (t) => {
  let now = 1000;
  const s = setup(t, { now: () => now });
  await s.controller.start();
  s.emit(ad('a'));
  s.emit(ad('b', -90));
  s.emit(ad('a', -68));
  assert.equal(s.controller.getSnapshot().devices.length, 2);
  assert.equal(s.controller.getSnapshot().devices[0].strong, true);
  s.emit(ad('a', -75));
  assert.equal(s.controller.getSnapshot().devices[0].strong, false);
  now += 15000;
  s.controller.prune();
  assert.equal(s.controller.getSnapshot().devices.length, 0);
});
test('unknown RSSI is not labelled near and list stays bounded', async (t) => {
  const s = setup(t);
  await s.controller.start();
  s.emit(ad('unknown', null));
  assert.equal(s.controller.getSnapshot().devices[0].strong, false);
  s.emit(ad('invalid', 127));
  assert.equal(
    s.controller.getSnapshot().devices.find((row) => row.id === 'invalid').rssi,
    null,
  );
  for (let i = 0; i < 80; i++) s.emit(ad(String(i)));
  assert.equal(s.controller.getSnapshot().devices.length, 50);
});
test('stop clears device data and ignores callbacks from the old scan', async (t) => {
  const s = setup(t);
  await s.controller.start();
  s.emit(ad('a'));
  s.controller.stop();
  s.emit(ad('late'));
  assert.equal(s.controller.getSnapshot().devices.length, 0);
  assert.equal(s.controller.getSnapshot().scanning, false);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(s.stops(), 1);
});
test('cancel during startup prevents a delayed scan becoming active', async (t) => {
  let release;
  const pending = new Promise((resolve) => (release = resolve));
  const s = setup(t, { pending });
  const starting = s.controller.start();
  await new Promise((resolve) => setImmediate(resolve));
  await s.controller.start();
  assert.equal(s.starts(), 1);
  s.controller.stop();
  release();
  await starting;
  assert.equal(s.controller.getSnapshot().scanning, false);
});
test('scan errors stop scanning and are shown for retry', async (t) => {
  const s = setup(t);
  await s.controller.start();
  s.fail('Bluetooth is off');
  assert.equal(s.controller.getSnapshot().error, 'Bluetooth is off');
  assert.equal(s.controller.getSnapshot().scanning, false);
  await s.controller.start();
  assert.equal(s.controller.getSnapshot().error, null);
});
test('scan automatically stops after 30 seconds', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const s = setup(t);
  await s.controller.start();
  s.emit(ad('a'));
  t.mock.timers.tick(30000);
  assert.equal(s.controller.getSnapshot().scanning, false);
  assert.equal(s.controller.getSnapshot().devices.length, 0);
  assert.match(s.controller.getSnapshot().notice, /finished/);
});
function native(options = {}) {
  let created = 0,
    destroyed = 0,
    requested;
  const State = {
    Unknown: 'Unknown',
    Resetting: 'Resetting',
    PoweredOn: 'PoweredOn',
    Unauthorized: 'Unauthorized',
    Unsupported: 'Unsupported',
  };
  class BleManager {
    constructor() {
      created++;
    }
    onStateChange(callback, emit) {
      if (emit) callback(options.state || State.PoweredOn);
      return { remove() {} };
    }
    async startDeviceScan(uuids, config, callback) {
      callback(null, {
        id: 'device',
        name: 'Beacon',
        localName: null,
        rssi: -55,
      });
    }
    async stopDeviceScan() {}
    async destroy() {
      destroyed++;
    }
  }
  const module = compile('src/features/nearby/scanner.native.ts', {
    'expo-constants': {
      __esModule: true,
      default: {
        executionEnvironment: options.expoGo ? 'storeClient' : 'standalone',
      },
      ExecutionEnvironment: { StoreClient: 'storeClient' },
    },
    'react-native': {
      Platform: { OS: 'android', Version: options.version || 31 },
      PermissionsAndroid: {
        PERMISSIONS: {
          BLUETOOTH_SCAN: 'scan',
          BLUETOOTH_CONNECT: 'connect',
          ACCESS_FINE_LOCATION: 'location',
        },
        RESULTS: { GRANTED: 'granted' },
        requestMultiple: async (permissions) => {
          requested = permissions;
          return Object.fromEntries(
            permissions.map((key) => [
              key,
              options.denied ? 'denied' : 'granted',
            ]),
          );
        },
      },
    },
    'react-native-ble-plx': { BleManager, State },
  });
  return {
    ...module,
    created: () => created,
    destroyed: () => destroyed,
    requested: () => requested,
  };
}
test('Expo Go and denied permission never initialize the native module', async () => {
  for (const options of [{ expoGo: true }, { denied: true }]) {
    const n = native(options);
    await assert.rejects(
      n.createScanner().start(
        () => {},
        () => {},
      ),
    );
    assert.equal(n.created(), 0);
  }
});
test('Android permissions vary by API level and scanning forwards actual signals', async () => {
  for (const version of [30, 31]) {
    const n = native({ version });
    const scanner = n.createScanner();
    const rows = [];
    await scanner.start(
      (row) => rows.push(row),
      () => {},
    );
    assert.deepEqual(
      n.requested(),
      version === 30 ? ['location'] : ['scan', 'connect'],
    );
    assert.deepEqual(rows, [{ id: 'device', name: 'Beacon', rssi: -55 }]);
    await scanner.stop();
    await scanner.stop();
    assert.equal(n.destroyed(), 1);
  }
});
test('stopping while waiting for Bluetooth state cancels initialization', async () => {
  const n = native({ state: 'Unknown' });
  const scanner = n.createScanner();
  const starting = scanner.start(
    () => assert.fail('Should not scan'),
    () => {},
  );
  await new Promise((resolve) => setImmediate(resolve));
  await scanner.stop();
  await starting;
  assert.equal(n.destroyed(), 1);
});
