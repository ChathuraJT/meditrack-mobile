const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
// Transpile the pure production model, using the existing TypeScript toolchain.
const filename = path.resolve('src/features/auth/model.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const modelModule = new Module(filename, module);
modelModule.filename = filename;
modelModule.paths = Module._nodeModulePaths(path.dirname(filename));
modelModule._compile(compiled, filename);
const {
  parseIdentifier,
  normalizePhone,
  optionalEmail,
  signupSchema,
  launchDestination,
  authErrorMessage,
} = modelModule.exports;

const valid = {
  full_name: 'නිමල් පෙරේරා',
  age: '24',
  gender: 'Prefer not to say',
  email: '',
  country: 'LK',
  phone: '0771234567',
  password: ' a password ',
  confirmPassword: ' a password ',
};
test('identifier distinguishes email and phone without account lookup', () => {
  assert.deepEqual(parseIdentifier('  patient@example.com  '), {
    email: 'patient@example.com',
  });
  assert.deepEqual(parseIdentifier('077 123 4567'), { phone: '+94771234567' });
  assert.equal(parseIdentifier('bad@'), null);
  assert.equal(parseIdentifier(''), null);
  assert.equal(parseIdentifier('1234'), null);
});
test('Sri Lankan local and international numbers normalize to E.164', () => {
  assert.equal(normalizePhone('0771234567'), '+94771234567');
  assert.equal(normalizePhone('+94 77 123 4567'), '+94771234567');
  assert.equal(normalizePhone('+44 7911 123456'), '+447911123456');
  assert.equal(normalizePhone('07911 123456', 'GB'), '+447911123456');
  assert.equal(normalizePhone('0771234567 ext 4'), null);
  assert.equal(normalizePhone('call 0771234567'), null);
});
test('optional email accepts blank and rejects malformed input', () => {
  for (const value of ['', '   ', 'patient@example.com'])
    assert.equal(optionalEmail.safeParse(value).success, true);
  assert.equal(optionalEmail.safeParse('not-an-email').success, false);
});
test('signup preserves password whitespace, supports Unicode, and validates exact confirmation', () => {
  const result = signupSchema.parse(valid);
  assert.equal(result.password, ' a password ');
  assert.equal(result.full_name, valid.full_name);
  assert.equal(
    signupSchema.safeParse({ ...valid, confirmPassword: valid.password.trim() })
      .success,
    false,
  );
  assert.equal(
    signupSchema.safeParse({
      ...valid,
      password: 'short',
      confirmPassword: 'short',
    }).success,
    false,
  );
  assert.equal(signupSchema.safeParse({ ...valid, age: '2.5' }).success, false);
  assert.equal(signupSchema.safeParse({ ...valid, age: '121' }).success, false);
  assert.equal(
    signupSchema.safeParse({ ...valid, gender: 'Doctor' }).success,
    false,
  );
});
test('launch never exposes tabs before restoration and requires a session', () => {
  for (const session of [false, true])
    for (const onboarded of [false, true])
      assert.equal(launchDestination(true, session, onboarded), 'loading');
  assert.equal(launchDestination(false, false, false), 'onboarding');
  assert.equal(launchDestination(false, false, true), 'login');
  assert.equal(launchDestination(false, true, false), 'patient');
  assert.equal(launchDestination(false, true, true), 'patient');
  // Sign-out keeps onboarding complete while removing access to patient tabs.
  assert.equal(launchDestination(false, false, true), 'login');
});
test('login errors do not distinguish account existence', () => {
  assert.equal(
    authErrorMessage({ code: 'invalid_credentials' }, 'login'),
    authErrorMessage({ code: 'user_not_found' }, 'login'),
  );
  assert.match(
    authErrorMessage({ status: 429 }, 'verify'),
    /Too many attempts/,
  );
});
