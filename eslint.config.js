import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'vendor/**', 'node_modules/**', 'public/build/**', 'storage/**',
      'output/**', 'visual-artifacts/**', 'playwright-report/**', 'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // The existing API clients use explicit any for untyped JSON payloads.
      '@typescript-eslint/no-explicit-any': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  { files: ['public/sw.js'], languageOptions: { globals: globals.serviceworker } },
  // Preserve retired components/helpers until their separate cleanup; all other
  // unused declarations remain errors, including declarations in new files.
  ...[
    ['resources/js/main.tsx', 'ClientForm|ClientHistory|overview|OrderView|ReportTemplateSettings|CatalogAdmin|ChecklistAdmin|AdminCatalogs'],
    ['resources/js/brand2026.ts', 'once|mark|enhanceServices'],
    ['resources/js/opening-whatsapp.ts', 'rewriteOpeningModal'],
    ['resources/js/order-detail-actions.ts', 'money'],
    ['resources/js/order-detail-react.tsx', 'Camera|InterruptionModal|ReportBox'],
    ['resources/js/record-management.ts', 'editIcon|reactOrderDetailActive|recordModal|installFinalizedEdit'],
    ['resources/js/ui-final-polish.ts', 'esc'],
  ].map(([file, names]) => ({
    files: [file],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: `^(${names})$`,
        argsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
    },
  })),
  {
    files: ['resources/js/brand2026.ts'],
    rules: { '@typescript-eslint/no-wrapper-object-types': 'off' },
  },
);
