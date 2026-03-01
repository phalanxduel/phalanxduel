import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import tsdoc from 'eslint-plugin-tsdoc';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '.worktrees/**',
      'docs/api/**',
      'shared/json-schema/**',
      'shared/src/types.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
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
    },
  },
  {
    // --- Pragmatic Overrides for non-source code ---
    files: ['bin/**/*.ts', 'scripts/**/*.ts', '**/tests/**/*.ts'],
    rules: {
      complexity: ['error', 50],
      'max-depth': ['error', 5],
      'max-params': ['error', 6],
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
    // --- Ratchet: Client Complexity (post-renderer decomposition) ---
    // renderBattlefield=44, renderGame=43 in game.ts still need headroom
    files: ['client/src/**/*.ts'],
    rules: {
      complexity: ['error', 45],
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
