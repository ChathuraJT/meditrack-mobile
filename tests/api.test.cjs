const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');

process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:8000';

// Mock expo-secure-store and react-native
const mockStore = new Map();
const secureStoreMock = {
  getItemAsync: async (key) => mockStore.get(key) || null,
  setItemAsync: async (key, val) => { mockStore.set(key, val); },
  deleteItemAsync: async (key) => { mockStore.delete(key); },
};
const reactNativeMock = {
  Platform: { OS: 'ios' }
};

// Custom require for api.ts
const originalRequire = Module.prototype.require;
Module.prototype.require = function(request) {
  if (request === 'expo-secure-store') return secureStoreMock;
  if (request === 'react-native') return reactNativeMock;
  return originalRequire.apply(this, arguments);
};

const filename = path.resolve('src/lib/api.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const apiModule = new Module(filename, module);
apiModule.filename = filename;
apiModule.paths = Module._nodeModulePaths(path.dirname(filename));
apiModule._compile(compiled, filename);

const { apiFetch, getSessionToken, setSessionToken, clearSessionToken, SESSION_TOKEN_KEY } = apiModule.exports;

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
    text: async () => '{"error": "Invalid credentials"}'
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
    assert.equal(error.message, 'Network request failed. Check your connection.');
  }
});
