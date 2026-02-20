import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'shared/json-schema/**',
      'shared/src/types.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'complexity': ['error', 50], // Start high and ratchet down as we refactor
      'max-depth': ['error', 5],   // Start high and ratchet down
      'max-params': ['error', 6],  // Start high and ratchet down
    },
  },
);
