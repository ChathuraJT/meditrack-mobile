const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');

process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:8000';
process.env.EXPO_PUBLIC_DJANGO_API_URL = 'http://192.0.2.1:8000/';

// Mock expo-secure-store and react-native
const mockStore = new Map();
const secureStoreMock = {
  getItemAsync: async (key) => mockStore.get(key) || null,
  setItemAsync: async (key, val) => {
    mockStore.set(key, val);
  },
  deleteItemAsync: async (key) => {
    mockStore.delete(key);
  },
};
const reactNativeMock = {
  Platform: { OS: 'ios' },
};

// Custom require for api.ts
const originalRequire = Module.prototype.require;
Module.prototype.require = function (request) {
  if (request === 'expo-secure-store') return secureStoreMock;
  if (request === 'react-native') return reactNativeMock;
  return originalRequire.apply(this, arguments);
};

const filename = path.resolve('src/lib/api.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const apiModule = new Module(filename, module);
apiModule.filename = filename;
apiModule.paths = Module._nodeModulePaths(path.dirname(filename));
apiModule._compile(compiled, filename);

const {
  apiFetch,
  getSessionToken,
  setSessionToken,
  clearSessionToken,
  SESSION_TOKEN_KEY,
} = apiModule.exports;

test('session restoration reads from secure store', async () => {
  mockStore.clear();
  await setSessionToken('test_token');
  const token = await getSessionToken();
  assert.equal(token, 'test_token');
});

test('logout cleanup clears local credentials', async () => {
  mockStore.clear();
  await setSessionToken('test_token');
  await clearSessionToken();
  const token = await getSessionToken();
  assert.equal(token, null);
});

test('authenticated 401 handling returns ApiError with status 401', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:8000';
  global.fetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: 'Invalid credentials' }),
    text: async () => '{"error": "Invalid credentials"}',
  });

  try {
    await apiFetch('/mobile/auth/me/');
    assert.fail('Should have thrown ApiError');
  } catch (error) {
    assert.equal(error.status, 401);
    assert.equal(error.message, 'Unauthorized');
  }
});

test('network failure handling throws ApiError', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:8000';
  global.fetch = async () => {
    throw new TypeError('Network request failed');
  };

  try {
    await apiFetch('/mobile/auth/me/');
    assert.fail('Should have thrown network error');
  } catch (error) {
    assert.equal(error.status, 0);
    assert.equal(
      error.message,
      'Network request failed. Check your connection.',
    );
  }
});

test('login and logout use cookies and fresh CSRF tokens without bearer credentials', async () => {
  await setSessionToken('obsolete-bearer-token');
  const requests = [];
  let csrf = 'before-login';
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/session/')) {
      return new Response(JSON.stringify({ user: null, csrfToken: csrf }));
    }
    csrf = 'after-login';
    return new Response(JSON.stringify({ id: 1, username: 'patient' }));
  };
  await apiFetch('/login/', {
    method: 'POST',
    body: JSON.stringify({ username: 'patient', password: ' test ' }),
  });
  await apiFetch('/logout/', { method: 'POST' });
  assert.deepEqual(
    requests.map(({ url }) => url),
    [
      'http://192.0.2.1:8000/session/',
      'http://192.0.2.1:8000/login/',
      'http://192.0.2.1:8000/session/',
      'http://192.0.2.1:8000/logout/',
    ],
  );
  for (const { options } of requests) {
    assert.equal(options.credentials, 'include');
    assert.equal(options.headers.has('Authorization'), false);
  }
  assert.equal(requests[1].options.headers.get('X-CSRFToken'), 'before-login');
  assert.equal(requests[3].options.headers.get('X-CSRFToken'), 'after-login');
  assert.equal(JSON.parse(requests[1].options.body).password, ' test ');
});

test('a missing CSRF token prevents submitting credentials', async () => {
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ user: null }));
  };
  await assert.rejects(
    apiFetch('/login/', { method: 'POST' }),
    /secure session/,
  );
  assert.equal(calls, 1);
});

test('account-bound uploads reject a changed session before sending locations', async () => {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    return new Response(JSON.stringify({ user: { id: 2 }, csrfToken: 'csrf' }));
  };
  await assert.rejects(
    apiFetch('/api/exposure/locations/', {
      method: 'POST',
      expectedUserId: 1,
      body: '{"samples":[]}',
    }),
    /session changed/,
  );
  assert.equal(calls.length, 1);
});

test('upload cancellation also aborts the session request', async () => {
  const abort = new AbortController();
  global.fetch = async (url, options) =>
    new Promise((resolve, reject) => {
      options.signal.addEventListener(
        'abort',
        () => reject(new DOMException('Cancelled', 'AbortError')),
        { once: true },
      );
      abort.abort();
    });
  await assert.rejects(
    apiFetch('/api/exposure/locations/', {
      method: 'POST',
      expectedUserId: 1,
      signal: abort.signal,
    }),
  );
});

test('upload uses the current session CSRF and keeps account metadata out of fetch', async () => {
  let sent;
  global.fetch = async (url, options) => {
    if (url.endsWith('/session/'))
      return new Response(
        JSON.stringify({ user: { id: 1 }, csrfToken: 'current-csrf' }),
      );
    sent = options;
    return new Response('{"created":1,"duplicates":0}');
  };
  await apiFetch('/api/exposure/locations/', {
    method: 'POST',
    expectedUserId: 1,
  });
  assert.equal(sent.headers.get('X-CSRFToken'), 'current-csrf');
  assert.equal(sent.credentials, 'include');
  assert.equal('expectedUserId' in sent, false);
});
