const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
function load(file) {
  const filename = path.resolve(file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(compiled, filename);
  return mod.exports;
}
const model = load('src/features/auth/model.ts');
const { postJson } = load('src/lib/api.ts');
const patient = {
  ...model.emptySignup,
  username: ' alice ',
  email: 'alice@example.com',
  password: ' x ',
  confirmPassword: ' x ',
  phone: '0771234567',
  NIC_number: '001234567V',
  birthday: '1998-05-20',
};
const profile = {
  username: 'alice',
  role: 'patient',
  doctorID: null,
  lab_name: null,
  license_id: null,
  lab_address: null,
};
test('login accepts username/email, trims only identifier and requires inputs', () => {
  for (const identifier of [' Alice ', ' Alice@example.com '])
    assert.deepEqual(model.loginSchema.parse({ identifier, password: ' x ' }), {
      identifier: identifier.trim(),
      password: ' x ',
    });
  assert.equal(
    model.loginSchema.safeParse({ identifier: ' ', password: '' }).success,
    false,
  );
});
test('signup exact payload, leading zeros, unchanged password and optional fields', () => {
  const payload = model.signupPayload({
    ...patient,
    degrees: 'stale',
    license_id: 'stale',
  });
  assert.equal(payload.username, 'alice');
  assert.equal(payload.password, ' x ');
  assert.equal(payload.phone, '0771234567');
  assert.equal(payload.NIC_number, '001234567V');
  assert.equal(payload.birthday, '1998-05-20');
  assert.equal(payload.degrees, '');
  assert.equal(payload.license_id, '');
  for (const key of ['confirmPassword', 'doctorID', 'is_approved'])
    assert.equal(key in payload, false);
  assert.ok(!Number.isNaN(Date.parse(payload.created_at)));
});
test('role, required fields, lengths, real dates and confirmation validation', () => {
  for (const edit of [
    { role: 'admin' },
    { email: 'wrong' },
    { birthday: '2025-02-29' },
    { birthday: '01/01/2000' },
    { phone: '1'.repeat(16) },
    { NIC_number: '1'.repeat(13) },
    { username: '' },
    { confirmPassword: 'x' },
  ])
    assert.equal(
      model.signupSchema.safeParse({ ...patient, ...edit }).success,
      false,
    );
  assert.equal(
    model.signupSchema.safeParse({ ...patient, role: 'doctor' }).success,
    true,
  );
  assert.equal(
    model.signupSchema.safeParse({ ...patient, role: 'lab' }).success,
    false,
  );
  assert.equal(
    model.signupSchema.safeParse({
      ...patient,
      role: 'lab',
      lab_name: 'Lab',
      lab_address: 'Address',
      license_id: '123',
    }).success,
    true,
  );
});
test('signup outcomes never auto-login and doctors stay pending', () => {
  assert.equal(model.signupOutcome('doctor').redirect, false);
  assert.equal(model.signupOutcome('patient').redirect, true);
  assert.equal(model.signupOutcome('lab').redirect, true);
});
test('profile validation and launch routing deny every non-patient role', () => {
  assert.deepEqual(
    model.profileSchema.parse({ ...profile, password: 'not retained' }),
    profile,
  );
  for (const bad of [
    {},
    { ...profile, doctorID: 12 },
    { ...profile, username: '' },
  ])
    assert.equal(model.profileSchema.safeParse(bad).success, false);
  assert.equal(model.launchDestination(true, null, false), 'loading');
  assert.equal(model.launchDestination(false, null, false), 'onboarding');
  assert.equal(model.launchDestination(false, null, true), 'login');
  assert.equal(model.launchDestination(false, profile, false), 'patient');
  for (const role of ['doctor', 'lab', 'admin', 'unknown'])
    assert.equal(
      model.launchDestination(false, { ...profile, role }, true),
      'unsupported',
    );
});
test('HTTP request shape and success', async (t) => {
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, 'https://example.test/login/');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), {
      username: 'alice',
      password: ' x ',
    });
    assert.equal(options.headers.Authorization, undefined);
    return new Response(JSON.stringify(profile), { status: 200 });
  });
  assert.deepEqual(
    await postJson('https://example.test/', '/login/', {
      username: 'alice',
      password: ' x ',
    }),
    profile,
  );
});
test('HTTP errors preserve API messages and status', async (t) => {
  for (const status of [400, 401, 403, 500]) {
    t.mock.method(
      global,
      'fetch',
      async () =>
        new Response(
          JSON.stringify({ error: 'Server explanation', message: 'secondary' }),
          { status },
        ),
    );
    await assert.rejects(
      postJson('https://example.test', '/login/', {}),
      (e) => e.status === status && e.message === 'Server explanation',
    );
  }
});
test('non-JSON, network errors, message fallback and timeout', async (t) => {
  t.mock.method(
    global,
    'fetch',
    async () => new Response('<html>private error</html>', { status: 500 }),
  );
  await assert.rejects(
    postJson('https://example.test', '/login/', {}),
    /Request failed \(500\)/,
  );
  t.mock.method(
    global,
    'fetch',
    async () => new Response('<html>oops</html>', { status: 200 }),
  );
  await assert.rejects(
    postJson('https://example.test', '/login/', {}),
    /unexpected response/,
  );
  t.mock.method(
    global,
    'fetch',
    async () =>
      new Response(JSON.stringify({ message: 'Try later' }), { status: 400 }),
  );
  await assert.rejects(
    postJson('https://example.test', '/login/', {}),
    /Try later/,
  );
  t.mock.method(global, 'fetch', async () => {
    throw new TypeError('fetch failed');
  });
  await assert.rejects(
    postJson('https://example.test', '/login/', {}),
    /Unable to reach/,
  );
  t.mock.method(
    global,
    'fetch',
    (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(new Error('aborted'))),
      ),
  );
  await assert.rejects(
    postJson('https://example.test', '/login/', {}, 5),
    /timed out/,
  );
  await assert.rejects(postJson(null, '/login/', {}), /Configure/);
});
