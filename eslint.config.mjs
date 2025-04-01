import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import stylistic from '@stylistic/eslint-plugin';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import _import from 'eslint-plugin-import';
import header from 'eslint-plugin-header';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

// See: https://github.com/Stuk/eslint-plugin-header/issues/57
header.rules.header.meta.schema = false;

export default [
  {
    ignores: [
      '**/bazel-out',
      '**/dist-schema',
      'goldens/public-api',
      'modules/testing/builder/projects',
      'packages/angular_devkit/build_angular/src/babel-bazel.d.ts',
      'packages/angular_devkit/build_angular/test',
      'packages/angular_devkit/build_webpack/test',
      'packages/angular_devkit/schematics_cli/blank/project-files',
      'packages/angular_devkit/schematics_cli/blank/schematic-files',
      'packages/angular_devkit/schematics_cli/schematic/files',
      '**/tests',
      '**/.yarn',
      '**/dist',
      '**/node_modules',
      '**/third_party',
    ],
  },
  ...fixupConfigRules(
    compat.extends(
      'eslint:recommended',
      'plugin:import/typescript',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
      'prettier',
    ),
  ),
  {
    plugins: {
      '@stylistic': stylistic,
      '@typescript-eslint': fixupPluginRules(typescriptEslint),
      import: fixupPluginRules(_import),
      header,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'module',

      parserOptions: {
        project: 'tsconfig.json',
      },
    },

    linterOptions: {
      // TODO: This defaults to "warn" in eslint9 and might be worth turning on.
      reportUnusedDisableDirectives: 'off',
    },

    rules: {
      '@stylistic/lines-around-comment': [
        'error',
        {
          allowArrayStart: true,
          allowBlockStart: true,
          allowClassStart: true,
          allowEnumStart: true,
          allowInterfaceStart: true,
          allowModuleStart: true,
          allowObjectStart: true,
          allowTypeStart: true,
          beforeBlockComment: true,
          ignorePattern: '@license',
        },
      ],

      '@stylistic/spaced-comment': ['error', 'always'],
      '@typescript-eslint/consistent-type-assertions': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-qualifier': 'error',
      '@typescript-eslint/no-unused-expressions': 'error',
      curly: 'error',

      'header/header': [
        'error',
        'block',
        [
          '*',
          ' * @license',
          ' * Copyright Google LLC All Rights Reserved.',
          ' *',
          ' * Use of this source code is governed by an MIT-style license that can be',
          ' * found in the LICENSE file at https://angular.dev/license',
          ' ',
        ],
        2,
      ],

      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-absolute-path': 'error',
      'import/no-duplicates': 'error',
      'import/order': [
        'error',
        {
          alphabetize: {
            order: 'asc',
          },

          groups: [['builtin', 'external'], 'parent', 'sibling', 'index'],
        },
      ],

      'max-len': [
        'error',
        {
          code: 140,
          ignoreUrls: true,
        },
      ],

      'max-lines-per-function': [
        'error',
        {
          max: 200,
        },
      ],

      'no-caller': 'error',
      'no-console': 'error',

      'no-empty': [
        'error',
        {
          allowEmptyCatch: true,
        },
      ],

      'no-eval': 'error',
      'no-multiple-empty-lines': ['error'],
      'no-throw-literal': 'error',

      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: '*',
          next: 'return',
        },
      ],

      'sort-imports': [
        'error',
        {
          ignoreDeclarationSort: true,
        },
      ],

      'spaced-comment': [
        'error',
        'always',
        {
          markers: ['/'],
        },
      ],

      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/no-implied-eval': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
  {
    files: ['!packages/**', '**/*_spec.ts'],

    rules: {
      'max-lines-per-function': 'off',
      'no-case-declarations': 'off',
      'no-console': 'off',
    },
  },
];
