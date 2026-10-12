import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        process: 'readonly',
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
  // TypeScript-aware adjustments
  // TS already checks undefined types; this rule misfires on type-only names like HeadersInit
  'no-undef': 'off',
  // Keep visibility of unuseds but don't fail CI; TS users often keep placeholders during dev
  'no-unused-vars': 'warn',
  // Allow intentionally empty blocks (e.g., try/catch placeholders) without failing
  'no-empty': 'warn',
  // Surface duplicate keys without failing the run
  'no-dupe-keys': 'warn',
      // Security rules
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      // Code quality
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn',
      // React specific rules
      'react-hooks/exhaustive-deps': 'warn',
    },
  }
);
