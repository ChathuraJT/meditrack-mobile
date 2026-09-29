const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier/flat');
module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    // A relative project path avoids glob characters in the checkout path.
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    ignores: ['dist/*', 'coverage/*'],
  },
]);
