import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'docs',
      'node_modules',
      '.board-build',
      'test-results',
      'playwright-report',
      'release',
      '.desktop-stage',
      '.wrangler',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  { files: ['public/sw.js'], languageOptions: { globals: globals.serviceworker } },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // The desktop shell and build scripts run in Node.
    files: ['desktop/**/*.cjs', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['worker/**/*.ts'],
    languageOptions: { globals: globals.serviceworker },
  },
  prettier,
);
