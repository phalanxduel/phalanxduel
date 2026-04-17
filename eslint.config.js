import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import tsdoc from 'eslint-plugin-tsdoc';
import pluginSecurity from 'eslint-plugin-security';

// When ESLINT_SKIP_PROJECT_SERVICE=1, skip type-aware project loading.
// Used for the memory-constrained containerized verify path (4GiB Colima VM)
// where `pnpm typecheck` (tsc) already provides full type safety coverage.
// Full type-aware linting is available via `pnpm lint:typed`.
const useProjectService = process.env['ESLINT_SKIP_PROJECT_SERVICE'] !== '1';

// Rules that require TypeScript type information (projectService).
// These are set to 'off' in fast mode to avoid ESLint crashing without type context.
const typedRules = useProjectService
  ? {
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
    }
  : {
      // Disable all type-aware rules when projectService is not loaded.
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/unified-signatures': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    };

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
      'sdk/**',
      'examples/**',
      '**/vitest.config.ts',
      '**/vite.config.ts',
      '**/drizzle.config.ts',
      'eslint.config.js',
    ],
  },
  eslint.configs.recommended,
  ...(useProjectService
    ? [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked]
    : tseslint.configs.recommended),
  pluginSecurity.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      parserOptions: useProjectService
        ? { projectService: true, tsconfigRootDir: import.meta.dirname }
        : {},
    },
    plugins: {
      tsdoc,
    },
    rules: {
      // --- Structural / style rules (always run, no type info required) ---
      'tsdoc/syntax': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      complexity: ['error', 15], // Enforce focused, maintainable functions
      'max-depth': ['error', 4],
      'max-params': ['error', 4],
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
      'security/detect-object-injection': 'off',

      // --- Type-aware rules (conditional on useProjectService) ---
      ...typedRules,
    },
  },
  ...(useProjectService
    ? [
        {
          files: ['**/bin/**/*.ts', '**/scripts/**/*.ts', '**/tests/**/*.ts'],
          ...tseslint.configs.disableTypeChecked,
        },
      ]
    : []),
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
