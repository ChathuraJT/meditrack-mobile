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
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    filename,
  );
  return loaded.exports;
}
const model = compile('src/features/consent/model.ts');
const { ConsentController } = compile('src/features/consent/controller.ts', {
  './model': model,
});
const { consentDocuments } = compile('src/features/consent/documents.ts');
const docs = {
  terms: { version: 'test-1', text: 'Test terms' },
  privacy: { version: 'test-privacy-1', text: 'Test notice' },
  research: {
    version: 'test-research-1',
    text: 'Test research information',
    retentionPeriod: 'Test period',
    recipients: 'Test team',
  },
};
const noOptional = { required: true, tracking: false, research: false };
const all = { required: true, tracking: true, research: true };
const at = '2026-10-26T10:00:00.000Z';
function memory() {
  const data = new Map();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      data.set(k, v);
    },
  };
}
function controller(
  db,
  id = 1,
  documents = docs,
  base = 'https://example.test',
) {
  return new ConsentController(
    db,
    model.consentScope(base, id),
    id,
    documents,
    () => at,
  );
}

test('shipped draft is version 1.0; deferred Privacy acknowledgement is never fabricated', async () => {
  assert.equal(consentDocuments.terms.version, '1.0');
  assert.match(
    consentDocuments.terms.text,
    /\[Responsible organisation or research institution\]/,
  );
  const c = controller(memory(), null, consentDocuments);
  await c.initialize();
  assert.equal(c.requiredAccepted(), false);
  await c.save(noOptional);
  assert.equal(c.requiredAccepted(), true);
  assert.equal(c.getSnapshot().record.privacy, null);
  assert.equal(c.canTrack(), false);
  assert.equal(c.canResearch(), false);
  await assert.rejects(c.save(all), /Privacy Notice/);
});

test('required acceptance is mandatory while declining optional purposes allows access', async () => {
  const c = controller(memory());
  await c.initialize();
  await assert.rejects(c.save({ ...all, required: false }), /Accept the Terms/);
  await c.save(noOptional);
  assert.equal(c.requiredAccepted(), true);
  assert.equal(c.canTrack(), false);
  assert.equal(c.canResearch(), false);
  assert.equal(c.getSnapshot().record.tracking.updatedAt, at);
});

test('research needs actual information, retention and recipients independently of tracking', () => {
  for (const research of [
    null,
    { ...docs.research, retentionPeriod: '' },
    { ...docs.research, recipients: '' },
    { ...docs.research, text: '' },
  ]) {
    const configured = { ...docs, research };
    assert.equal(model.researchAvailable(configured), false);
    assert.throws(
      () => model.makeRecord(null, all, configured, at),
      /Research information/,
    );
    const record = model.makeRecord(
      null,
      { ...noOptional, tracking: true },
      configured,
      at,
    );
    assert.equal(model.trackingAllowed(record, configured), true);
  }
});

test('pre-auth acceptance and other accounts/backends cannot authorize the current account', async () => {
  const db = memory();
  const anonymous = controller(db, null);
  await anonymous.initialize();
  await anonymous.save(all);
  assert.equal(anonymous.canTrack(), false);
  const a = controller(db, 1);
  await a.initialize();
  assert.equal(a.requiredAccepted(), false);
  await a.save(all);
  assert.equal(a.canTrack(), true);
  const b = controller(db, 2);
  const otherServer = controller(db, 1, docs, 'https://other.test');
  await b.initialize();
  await otherServer.initialize();
  assert.equal(b.requiredAccepted(), false);
  assert.equal(otherServer.canResearch(), false);
  const restored = controller(db, 1);
  await restored.initialize();
  assert.equal(restored.requiredAccepted(), true);
  assert.equal(restored.canTrack(), true);
  assert.equal(
    JSON.parse([...db.data.values()][1]).serverPersistence,
    'not_implemented',
  );
});

test('required Terms/Privacy changes require fresh acceptance and disable optional work', async () => {
  const db = memory();
  const old = controller(db);
  await old.initialize();
  await old.save(all);
  for (const changed of [
    { ...docs, terms: { ...docs.terms, version: 'test-2' } },
    { ...docs, privacy: { ...docs.privacy, version: 'test-privacy-2' } },
  ]) {
    const c = controller(db, 1, changed);
    await c.initialize();
    assert.equal(c.requiredAccepted(), false);
    assert.equal(c.canTrack(), false);
    assert.equal(c.canResearch(), false);
  }
  const deferred = controller(memory(), 1, {
    ...docs,
    privacy: null,
    research: null,
  });
  await deferred.initialize();
  await deferred.save(noOptional);
  assert.equal(
    model.requiredCurrent(deferred.getSnapshot().record, docs),
    false,
  );
});

test('research version/retention changes disable research but not unrelated accepted access', () => {
  const record = model.makeRecord(null, all, docs, at);
  for (const research of [
    { ...docs.research, version: 'test-2' },
    { ...docs.research, retentionPeriod: 'Different test period' },
  ]) {
    const next = { ...docs, research };
    assert.equal(model.requiredCurrent(record, next), true);
    assert.equal(model.trackingAllowed(record, next), true);
    assert.equal(model.researchAllowed(record, next), false);
  }
});

test('withdrawal is immediate, persisted with timestamp, and retains the original acceptance event', async () => {
  const db = memory();
  const c = controller(db);
  await c.initialize();
  await c.save(all);
  const pending = c.withdraw('tracking');
  assert.equal(c.canTrack(), false);
  await pending;
  assert.equal(c.getSnapshot().record.tracking.withdrawnAt, at);
  assert.equal(c.canResearch(), true);
  const restored = controller(db);
  await restored.initialize();
  assert.equal(restored.canTrack(), false);
  const journal = JSON.parse([...db.data.values()][0]);
  assert.equal(journal.events.length, 2);
  assert.equal(journal.events[0].tracking.granted, true);
  assert.equal(journal.events[1].tracking.granted, false);
});

test('withdrawal works with an outdated required version without reaccepting it', async () => {
  const db = memory();
  const old = controller(db);
  await old.initialize();
  await old.save(all);
  const c = controller(db, 1, {
    ...docs,
    terms: { ...docs.terms, version: 'test-2' },
  });
  await c.initialize();
  await c.withdraw('research');
  assert.equal(c.requiredAccepted(), false);
  assert.equal(c.getSnapshot().record.terms.version, 'test-1');
  assert.equal(c.getSnapshot().record.research.withdrawnAt, at);
});

test('failed storage never reports success; optional work stays blocked for this session', async () => {
  const db = memory();
  const c = controller(db);
  await c.initialize();
  await c.save(all);
  db.setItem = async () => {
    throw new Error('disk');
  };
  await assert.rejects(c.withdraw('research'), /Could not be saved/i);
  assert.equal(c.canResearch(), false);
  assert.equal(c.canTrack(), false);
  assert.ok(c.getSnapshot().error);
});

test('corrupt or wrong-account consent fails closed and can be retried without erasing evidence', async () => {
  const db = memory();
  const c = controller(db);
  await c.initialize();
  await c.save(all);
  const [key, original] = [...db.data.entries()][0];
  db.data.set(key, '{invalid');
  const bad = controller(db);
  await bad.initialize();
  assert.equal(bad.requiredAccepted(), false);
  assert.equal(bad.canTrack(), false);
  assert.ok(bad.getSnapshot().error);
  db.data.set(key, original);
  await bad.initialize();
  assert.equal(bad.requiredAccepted(), true);
  assert.throws(() =>
    model.parseJournal(original, model.consentScope('https://example.test', 2)),
  );
});

test('disposal blocks old account work and late writes cannot update a new account', async () => {
  const db = memory();
  const c = controller(db);
  await c.initialize();
  await c.save(all);
  let finish;
  db.setItem = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const pending = c.save(noOptional);
  c.dispose();
  finish();
  await pending;
  assert.equal(c.canTrack(), false);
  assert.equal(c.canResearch(), false);
  await assert.rejects(c.save(all), /not ready/);
});

test('double save is rejected instead of losing audit events', async () => {
  const db = memory();
  const c = controller(db);
  await c.initialize();
  let finish;
  db.setItem = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const first = c.save(noOptional);
  await assert.rejects(c.save(all), /not ready/);
  finish();
  await first;
});

const jsx = (type, props) => ({ type, props: props ?? {} });
const runtime = { jsx, jsxs: jsx, Fragment: 'fragment' };
function expand(node) {
  if (node == null || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(expand);
  if (typeof node.type === 'function') return expand(node.type(node.props));
  return [node, ...expand(node.props?.children)];
}
const container = ({ children }) => children;
const ui = {
  'react/jsx-runtime': runtime,
  '@/components/ui/AppButton': { AppButton: 'button' },
  '@/components/ui/AppCard': { AppCard: 'card' },
  '@/components/ui/AppText': { AppText: 'text' },
  '@/components/ui/Screen': { Screen: container },
  '@/theme/tokens': { useThemeColors: () => ({}), spacing: {}, radius: {} },
};

test('first-launch UI has three unchecked controls, preserves optional declines and makes no permission request', async () => {
  const c = controller(memory(), null, consentDocuments);
  await c.initialize();
  let cursor = 0;
  const states = [];
  const { TermsScreen } = compile('src/features/consent/TermsScreen.tsx', {
    ...ui,
    react: {
      useState: (initial) => {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [
          states[index],
          (next) => {
            states[index] = next;
          },
        ];
      },
    },
    'react-native': {
      View: 'view',
      Pressable: 'checkbox',
      StyleSheet: { create: (s) => s },
      Linking: {
        openURL: () => {
          throw new Error('No link should open on acceptance');
        },
      },
    },
    '@expo/vector-icons/Ionicons': 'icon',
    '@/features/auth/AuthProvider': { useAuth: () => ({ session: null }) },
    '@/features/auth/SignOutButton': { SignOutButton: 'signout' },
    './ConsentProvider': {
      useConsentController: () => c,
      useConsentState: () => c.getSnapshot(),
    },
    './model': model,
  });
  const render = () => {
    cursor = 0;
    return expand(jsx(TermsScreen));
  };
  let nodes = render();
  const boxes = nodes.filter((n) => n.type === 'checkbox');
  assert.equal(boxes.length, 3);
  assert.ok(boxes.every((n) => n.props.accessibilityState.checked === false));
  assert.equal(boxes[1].props.disabled, true);
  assert.equal(boxes[2].props.disabled, true);
  assert.equal(
    nodes.find((n) => n.props.label === 'Save choices and continue').props
      .disabled,
    true,
  );
  boxes[0].props.onPress();
  nodes = render();
  const save = nodes.find((n) => n.props.label === 'Save choices and continue');
  assert.equal(save.props.disabled, false);
  save.props.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(c.requiredAccepted(), true);
  assert.equal(c.getSnapshot().record.privacy, null);
  assert.equal(c.getSnapshot().record.tracking.granted, false);
  assert.equal(c.getSnapshot().record.research.granted, false);
});

test('root navigation gates auth and patient deep links and preserves onboarding after acceptance', () => {
  let accepted = false;
  const auth = {
    initializing: false,
    session: null,
    onboarded: false,
    error: null,
  };
  const consent = { requiredAccepted: () => accepted };
  const Stack = container;
  Stack.Protected = function Protected({ guard, children }) {
    return guard ? children : null;
  };
  Stack.Screen = 'route';
  const { default: Root } = compile('src/app/_layout.tsx', {
    ...ui,
    'react-native': { ActivityIndicator: 'loading' },
    'expo-router': { Stack },
    'expo-status-bar': { StatusBar: 'status' },
    'react-native-safe-area-context': { SafeAreaProvider: container },
    '@tanstack/react-query': { QueryClientProvider: container },
    '@/lib/query-client': { queryClient: {} },
    '@/theme/ThemeProvider': {
      ThemeProvider: container,
      useColorScheme: () => 'light',
    },
    '@/features/auth/AuthProvider': {
      AuthProvider: container,
      useAuth: () => auth,
    },
    '@/features/auth/model': {
      launchDestination: (initializing, session, onboarded) =>
        initializing
          ? 'loading'
          : session
            ? 'patient'
            : onboarded
              ? 'login'
              : 'onboarding',
    },
    '@/features/consent/ConsentProvider': {
      ConsentProvider: container,
      useConsentController: () => consent,
      useConsentState: () => ({ ready: true, error: null }),
    },
  });
  const routes = () =>
    expand(jsx(Root))
      .filter((n) => n.type === 'route')
      .map((n) => n.props.name);
  assert.deepEqual(routes(), ['terms']);
  accepted = true;
  assert.deepEqual(routes(), ['onboarding']);
  auth.onboarded = true;
  assert.deepEqual(routes(), ['(auth)']);
  auth.session = { user: { id: 1 } };
  accepted = false;
  assert.deepEqual(routes(), ['terms']);
  accepted = true;
  assert.deepEqual(routes(), ['(patient)']);
  accepted = false; // Required version changes and newly selected accounts.
  assert.deepEqual(routes(), ['terms']);
});
