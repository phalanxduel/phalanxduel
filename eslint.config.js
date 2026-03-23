import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import tsdoc from 'eslint-plugin-tsdoc';
import pluginSecurity from 'eslint-plugin-security';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '.worktrees/**',
      'docs/api/**',
      'shared/json-schema/**',
      'shared/src/types.ts',
      'tests/load/**',
      'tmp/**',
      'scripts/**',
      'bin/**',
      '**/vitest.config.ts',
      '**/vite.config.ts',
      '**/drizzle.config.ts',
      'eslint.config.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  pluginSecurity.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      tsdoc,
    },
    rules: {
      'tsdoc/syntax': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      complexity: ['error', 15], // Enforce focused, maintainable functions
      'max-depth': ['error', 4],
      'max-params': ['error', 4],
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
      // --- Pragmatic strictTypeChecked rule tuning ---
      // Strategy: ratchet rules as 'warn' for incremental adoption.
      // New code must satisfy these; existing violations are tracked for cleanup.

      // --- Safety: keep as error ---
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],

      // --- Ratchets: adopt incrementally ---
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/return-await': 'warn',
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'warn',
      '@typescript-eslint/no-dynamic-delete': 'warn',
      '@typescript-eslint/no-extraneous-class': 'warn',
      '@typescript-eslint/no-unnecessary-type-parameters': 'warn',
      '@typescript-eslint/no-confusing-void-expression': 'warn',
      '@typescript-eslint/unified-signatures': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',

      // --- Disabled: too noisy or incompatible ---
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'security/detect-object-injection': 'off',
    },
  },
  {
    files: ['**/bin/**/*.ts', '**/scripts/**/*.ts', '**/tests/**/*.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // --- Pragmatic Overrides for non-source code ---
    files: ['**/bin/**/*.ts', '**/scripts/**/*.ts', '**/tests/**/*.ts'],
    rules: {
      complexity: ['error', 50],
      'max-depth': ['error', 5],
      'max-params': ['error', 6],
      // Tests commonly use non-null assertions on controlled fixtures and
      // unbound methods for assertions and flexible typing
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    // --- Ratchet: Engine Complexity (Transitioning to v1.0) ---
    files: ['engine/src/**/*.ts'],
    rules: {
      complexity: ['error', 45], // Catch applyAction drift
      'max-params': ['error', 6], // Allow resolveColumnOverflow
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@phalanxduel/server', '@phalanxduel/client'],
              message: 'The Engine must remain a pure, environment-agnostic ruleset.',
            },
          ],
        },
      ],
    },
  },
  {
    // --- Ratchet: Admin Complexity ---
    files: ['admin/src/**/*.ts', 'admin/src/**/*.tsx'],
  },
  {
    // --- Ratchet: Client Complexity (post-renderer decomposition) ---
    // After helper extraction: renderGame=28, renderStatsSidebar=24, attachCellInteraction=22
    files: ['client/src/**/*.ts', 'client/src/**/*.tsx'],
    rules: {
      complexity: ['error', 30],
      'max-depth': ['error', 5],
    },
  },
  {
    // --- Ratchet: Server App Complexity ---
    files: ['server/src/**/*.ts'],
    rules: {
      complexity: ['error', 20],
    },
  },
);
