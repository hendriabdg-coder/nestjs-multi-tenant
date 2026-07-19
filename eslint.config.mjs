// @ts-check
import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  eslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'example/src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2021,
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'warn',
    },
  },
  {
    files: ['src/**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  prettier,
  {
    ignores: ['dist/**', 'coverage/**', 'example/dist/**', 'node_modules/**'],
  },
];
