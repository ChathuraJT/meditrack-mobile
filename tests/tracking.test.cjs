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
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (name) =>
    name in mocks ? mocks[name] : originalRequire(name);
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
  return loaded.exports;
}
const { createTrackingStore, RETENTION_MS } = compile(
  'src/features/tracking/storage.ts',
);
const { TrackingController } = compile('src/features/tracking/controller.ts');
function memory() {
  const data = new Map();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      data.set(k, v);
    },
    getAllKeys: async () => [...data.keys()],
    multiRemove: async (keys) => {
      for (const key of keys) data.delete(key);
    },
  };
}
function sample(id = 'uuid-1', now = Date.now()) {
  return {
    client_record_id: id,
    latitude: 5.95,
    longitude: 80.55,
    recorded_at: new Date(now).toISOString(),
    accuracy_m: 12,
    data_mode: 'real',
  };
}
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
function setup(t, overrides = {}) {
  const store = createTrackingStore(memory(), 'server|1');
  const writes = [];
  const controller = new TrackingController({
    store,
    consent: async (value) => {
      writes.push(value);
      return value ?? false;
    },
    permission: async () => 'granted',
    capture: async () => sample(),
    ...overrides,
  });
  t.after(() => controller.dispose());
  return { controller, store, writes };
}
test('local records are isolated by account and backend; clear preserves other app data', async () => {
  const db = memory();
  const a = createTrackingStore(db, 'server|1'),
    b = createTrackingStore(db, 'server|2');
  const c = createTrackingStore(db, 'other-server|1');
  await db.setItem('unrelated', 'keep');
  await a.append(sample('a'));
  await b.append(sample('b'));
  await c.append(sample('c'));
  assert.equal((await a.summary()).latest.client_record_id, 'a');
  await a.clear();
  assert.equal((await a.summary()).count, 0);
  assert.equal((await b.summary()).count, 1);
  assert.equal((await c.summary()).count, 1);
  assert.equal(await db.getItem('unrelated'), 'keep');
});
test('retention expires on recorded time, including the exact 14-day boundary', async () => {
  const store = createTrackingStore(memory(), '1'),
    now = Date.now();
  await store.append(sample('old', now - RETENTION_MS + 1), now);
  await store.append(sample('recent', now), now);
  assert.equal((await store.summary(now)).count, 2);
  assert.equal((await store.summary(now + 1)).count, 1);
  await assert.rejects(store.append(sample('future', now + 1), now));
  await assert.rejects(store.append({ ...sample(), accuracy_m: null }, now));
});
test('concurrent appends and duplicate retries do not lose or duplicate samples', async () => {
  const store = createTrackingStore(memory(), '1');
  await Promise.all([
    store.append(sample('a')),
    store.append(sample('b')),
    store.append(sample('a')),
  ]);
  assert.equal((await store.summary()).count, 2);
});
test('initialization never records automatically; explicit start saves consent then captures', async (t) => {
  const { controller, store, writes } = setup(t);
  await controller.initialize();
  assert.equal((await store.summary()).count, 0);
  await controller.start();
  assert.deepEqual(writes, [undefined, true]);
  assert.equal((await store.summary()).count, 1);
  await controller.tick();
  assert.equal((await store.summary()).count, 1);
});
test('permission denial and failed server consent prevent collection', async (t) => {
  const denied = setup(t, { permission: async () => 'denied' });
  await denied.controller.initialize();
  await denied.controller.start();
  assert.equal(denied.controller.getSnapshot().enabled, false);
  assert.equal((await denied.store.summary()).count, 0);
  assert.deepEqual(denied.writes, [undefined]);
  const offline = setup(t, {
    consent: async () => {
      throw new Error('offline');
    },
  });
  await offline.controller.initialize();
  await offline.controller.start();
  assert.equal((await offline.store.summary()).count, 0);
});
test('OFF discards a late GPS fix and persists withdrawal for retry when offline', async (t) => {
  const fix = deferred();
  let offline = false;
  const { controller, store } = setup(t, {
    capture: () => fix.promise,
    consent: async (value) => {
      if (offline) throw new Error('offline');
      return value ?? false;
    },
  });
  await controller.initialize();
  const start = controller.start();
  await new Promise((r) => setImmediate(r));
  offline = true;
  await controller.stop();
  fix.resolve(sample());
  await start;
  assert.equal(controller.getSnapshot().enabled, false);
  assert.equal(await store.pendingOff(), true);
  assert.equal((await store.summary()).count, 0);
  offline = false;
  await controller.refreshConsent();
  assert.equal(await store.pendingOff(), false);
  assert.equal(controller.getSnapshot().consent, false);
});
test('backgrounding and disposal discard in-flight fixes', async (t) => {
  for (const action of ['background', 'dispose']) {
    const fix = deferred();
    const { controller, store } = setup(t, { capture: () => fix.promise });
    await controller.initialize();
    const start = controller.start();
    await new Promise((r) => setImmediate(r));
    if (action === 'background') controller.setForeground(false);
    else controller.dispose();
    fix.resolve(sample());
    await start;
    assert.equal((await store.summary()).count, 0);
  }
});
test('pending withdrawal survives restart and is sent before any new consent', async (t) => {
  const store = createTrackingStore(memory(), '1');
  await store.setPendingOff(true);
  const { controller, writes } = setup(t, { store });
  await controller.initialize();
  assert.deepEqual(writes, [false]);
  assert.equal(controller.getSnapshot().enabled, false);
  assert.equal(await store.pendingOff(), false);
});
test('OFF wins over a delayed consent refresh', async (t) => {
  let hold = false;
  const response = deferred();
  const { controller, store } = setup(t, {
    consent: async (value) =>
      hold && value === undefined ? response.promise : (value ?? true),
  });
  await controller.initialize();
  await controller.start();
  hold = true;
  const refresh = controller.refreshConsent();
  await controller.stop();
  response.resolve(true);
  await refresh;
  await new Promise((r) => setImmediate(r));
  assert.equal(controller.getSnapshot().enabled, false);
  assert.equal(controller.getSnapshot().consent, false);
  assert.equal(await store.pendingOff(), false);
});

const settle = () => new Promise((resolve) => setImmediate(resolve));
test('upload failure keeps records; duplicate acknowledgement survives restart', async (t) => {
  let fail = true;
  const batches = [];
  const db = memory();
  const store = createTrackingStore(db, 'server|1');
  const { controller } = setup(t, {
    store,
    upload: async (rows) => {
      batches.push(rows.map((row) => row.client_record_id));
      if (fail) throw new Error('offline');
      return { created: 0, duplicates: rows.length };
    },
  });
  await controller.initialize();
  await controller.start();
  await settle();
  assert.equal((await store.pending()).length, 1);
  assert.equal(controller.getSnapshot().uploadError, 'offline');
  fail = false;
  await controller.sync();
  assert.deepEqual(batches[0], batches.at(-1));
  assert.equal((await createTrackingStore(db, 'server|1').pending()).length, 0);
  assert.equal((await store.summary()).count, 1);
  assert.ok(controller.getSnapshot().lastUpload);
});

test('upload uses batches of at most 500 and excludes expired records', async (t) => {
  const store = createTrackingStore(memory(), 'server|1');
  const now = Date.now();
  await store.append(sample('expired', now - RETENTION_MS + 1), now);
  for (let i = 0; i < 501; i++) await store.append(sample(`record-${i}`));
  const sizes = [];
  const { controller } = setup(t, {
    store,
    upload: async (rows) => {
      assert.ok(rows.every((row) => row.client_record_id !== 'expired'));
      sizes.push(rows.length);
      return { created: rows.length, duplicates: 0 };
    },
  });
  await controller.initialize();
  assert.equal(sizes.length, 0);
  await controller.start();
  for (let i = 0; i < 20 && controller.getSnapshot().uploading; i++)
    await settle();
  assert.deepEqual(sizes, [500, 2]);
  assert.equal((await store.pending()).length, 0);
});

test('malformed acknowledgement cannot discard the upload queue', async (t) => {
  const { controller, store } = setup(t, {
    upload: async () => ({ created: 0, duplicates: 0 }),
  });
  await controller.initialize();
  await controller.start();
  await settle();
  assert.equal((await store.pending()).length, 1);
  assert.match(controller.getSnapshot().uploadError, /whole batch/);
});

test('OFF and disposal abort uploads and do not acknowledge late responses', async (t) => {
  for (const action of ['stop', 'dispose', 'background']) {
    const response = deferred();
    let signal;
    const { controller, store } = setup(t, {
      upload: async (rows, value) => {
        signal = value;
        return response.promise;
      },
    });
    await controller.initialize();
    await controller.start();
    await settle();
    assert.ok(signal);
    if (action === 'stop') await controller.stop();
    else if (action === 'dispose') controller.dispose();
    else controller.setForeground(false);
    assert.equal(signal.aborted, true);
    response.resolve({ created: 1, duplicates: 0 });
    await settle();
    assert.equal((await store.pending()).length, 1);
  }
});

test('transport sends only accepted fields and binds requests to the account', async () => {
  const requests = [];
  const backend = compile('src/features/tracking/backend.ts', {
    '@/lib/api': {
      apiFetch: async (path, options) => {
        requests.push({ path, options });
        return { created: 1, duplicates: 0 };
      },
    },
  });
  const signal = new AbortController().signal;
  await backend.uploadLocations(
    42,
    [{ ...sample(), uploaded_at: 'private-local-state' }],
    signal,
  );
  assert.equal(requests[0].options.expectedUserId, 42);
  assert.equal(requests[0].options.signal, signal);
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    samples: [
      sample(
        'uuid-1',
        Date.parse(JSON.parse(requests[0].options.body).samples[0].recorded_at),
      ),
    ],
  });
  assert.equal(backend.analysisScore(null), 'Not calculated yet');
  assert.equal(backend.analysisScore(0), 'Model score: 0');
});

test('history and analysis load real account data and preserve null scores', async () => {
  let response = [sample()];
  const requests = [];
  const backend = compile('src/features/tracking/backend.ts', {
    '@/lib/api': {
      apiFetch: async (path, options) => {
        requests.push({ path, options });
        return response;
      },
    },
  });
  const signal = new AbortController().signal;
  assert.equal((await backend.loadLocations(7, signal)).length, 1);
  response = [
    {
      id: 1,
      disease_code: 'influenza',
      data_mode: 'real',
      analysed_at: new Date().toISOString(),
      model_score: null,
      exposure_summary: { status: 'not_scored' },
    },
  ];
  assert.equal((await backend.loadAnalyses(7, signal))[0].model_score, null);
  response[0].model_score = '0';
  assert.equal((await backend.loadAnalyses(7, signal))[0].model_score, 0);
  response[0].model_score = 'invalid';
  await assert.rejects(backend.loadAnalyses(7, signal));
  response = [{ ...sample(), data_mode: 'synthetic_demo' }];
  await assert.rejects(backend.loadLocations(7, signal));
  assert.ok(
    requests.every(
      (row) =>
        row.options.expectedUserId === 7 &&
        row.path.endsWith('?data_mode=real'),
    ),
  );
});
