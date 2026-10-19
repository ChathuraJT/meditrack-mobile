const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
function compile(file, mocks = {}) {
  const filename = path.resolve(file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = (name) => (name in mocks ? mocks[name] : require(name));
  loaded._compile(compiled, filename);
  return loaded.exports;
}
const dates = compile('src/features/channel-doctor/booking.ts');
test('booking dates use local calendar days and reject invalid or past dates', () => {
  const today = new Date(2026, 9, 20, 0, 5);
  assert.equal(dates.localDate(today), '2026-10-20');
  for (const value of [
    '2026-10-2',
    '2026-10-19',
    '2026-02-30',
    '2027-13-01',
    '2027-02-29',
    'not a date',
  ]) {
    assert.equal(dates.isBookableDate(value, today), false, value);
  }
  for (const value of ['2026-10-20', '2026-10-21', '2028-02-29'])
    assert.equal(dates.isBookableDate(value, today), true, value);
});
test('changing dates discards stale availability and blocks invalid booking and repeated submits', async () => {
  let cursor = 0;
  const states = [];
  const effects = [];
  const pending = [];
  let posts = 0;
  const react = {
    createElement: (type, props, ...children) => ({
      type,
      props: { ...props, children },
    }),
    useState(initial) {
      const id = cursor++;
      if (!(id in states)) states[id] = initial;
      return [
        states[id],
        (value) => {
          states[id] = typeof value === 'function' ? value(states[id]) : value;
        },
      ];
    },
    useRef(value) {
      const id = cursor++;
      return (states[id] ??= { current: value });
    },
    useCallback: (fn) => fn,
    useEffect: (fn) => {
      effects.push(fn);
    },
  };
  const doctor = {
    doctor_id: 'D1',
    doctors_name: 'Test Doctor',
    degrees: 'MBBS',
    working_hospital: 'Test Hospital',
    is_available: true,
  };
  const theme = { accents: { blue: 'blue' } };
  const mocks = {
    react,
    'react-native': {
      View: 'View',
      Pressable: 'Pressable',
      TextInput: 'TextInput',
      Modal: 'Modal',
      ActivityIndicator: 'Spinner',
      Alert: { alert() {} },
      StyleSheet: { create: (s) => s },
    },
    'expo-router': { useFocusEffect: (fn) => effects.push(fn) },
    './booking': dates,
    '@expo/vector-icons/Ionicons': 'Icon',
    '@/components/ui/Screen': { Screen: 'Screen' },
    '@/components/ui/AppText': { AppText: 'Text' },
    '@/components/ui/CareCard': 'Card',
    '@/theme/careCard': { useCareCardColors: () => theme },
    '@/theme/tokens': { colors: {}, spacing: {}, radius: {} },
    '@/features/auth/AuthProvider': {
      useAuth: () => ({ session: { user: { username: 'patient' } } }),
    },
    '@/lib/api': {
      apiFetch: (url, options) => {
        if (options?.method === 'POST') {
          posts++;
          return new Promise(() => {});
        }
        if (url === '/get-doctor/')
          return Promise.resolve({ doctors: [doctor] });
        if (url.includes('my-queue'))
          return Promise.resolve({ has_appointment: false });
        return new Promise((resolve) => pending.push(resolve));
      },
    },
  };
  const { ChannelDoctorScreen } = compile(
    'src/features/channel-doctor/ChannelDoctorScreen.tsx',
    mocks,
  );
  function render() {
    cursor = 0;
    effects.length = 0;
    return ChannelDoctorScreen();
  }
  function nodes(tree) {
    return !tree || typeof tree !== 'object'
      ? []
      : [tree, ...(tree.props?.children || []).flat(Infinity).flatMap(nodes)];
  }
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  render();
  const cleanup = effects
    .map((effect) => effect())
    .filter((value) => typeof value === 'function');
  try {
    await flush();
    let tree = render();
    nodes(tree)
      .find(
        (n) =>
          n.type === 'Pressable' &&
          String(JSON.stringify(n.props.children)).includes(
            'Book Queue Token (Live)',
          ),
      )
      .props.onPress();
    tree = render();
    const dateInput = () =>
      nodes(render()).find(
        (n) => n.type === 'TextInput' && n.props.placeholder === 'YYYY-MM-DD',
      );
    dateInput().props.onChangeText('2099-01-01');
    pending[1]({ available: true, next_token: '2' });
    await flush();
    pending[0]({ available: false });
    await flush();
    const confirm = () =>
      nodes(render()).find(
        (n) =>
          n.type === 'Pressable' &&
          n.props.children
            .flat(Infinity)
            .some(
              (child) =>
                child?.type === 'Text' &&
                child.props.children.includes('Confirm & Get Queue Token'),
            ),
      );
    assert.equal(
      confirm().props.disabled,
      false,
      'older response must not replace latest schedule',
    );
    dateInput().props.onChangeText('2099-01-0');
    tree = render();
    assert.equal(
      nodes(tree).some(
        (n) =>
          n.type === 'Pressable' &&
          !n.props.disabled &&
          n.props.children
            .flat(Infinity)
            .some(
              (child) =>
                child?.type === 'Text' &&
                child.props.children.includes('Confirm & Get Queue Token'),
            ),
      ),
      false,
    );
    assert.equal(posts, 0);
    dateInput().props.onChangeText('2099-01-02');
    pending[2]({ available: true });
    await flush();
    const submit = confirm().props.onPress;
    void submit();
    void submit();
    assert.equal(posts, 1, 'rapid taps must submit only once');
  } finally {
    cleanup.forEach((fn) => fn());
  }
});
