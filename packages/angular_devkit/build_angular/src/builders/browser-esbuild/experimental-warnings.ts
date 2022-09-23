/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { Schema as BrowserBuilderOptions } from '../browser/schema';

const UNSUPPORTED_OPTIONS: Array<keyof BrowserBuilderOptions> = [
  'allowedCommonJsDependencies',
  'budgets',
  'extractLicenses',
  'progress',
  'scripts',
  'statsJson',

  // * i18n support
  'localize',
  // The following two have no effect when localize is not enabled
  // 'i18nDuplicateTranslation',
  // 'i18nMissingTranslation',

  // * Stylesheet preprocessor support
  'inlineStyleLanguage',
  // The following option has no effect until preprocessors are supported
  // 'stylePreprocessorOptions',

  // * Deprecated
  'deployUrl',

  // * Always enabled with esbuild
  // 'commonChunk',

  // * Currently unsupported by esbuild
  'namedChunks',
  'vendorChunk',
  'webWorkerTsConfig',
];

export function logExperimentalWarnings(options: BrowserBuilderOptions, context: BuilderContext) {
  // Warn about experimental status of this builder
  context.logger.warn(
    `The esbuild browser application builder ('browser-esbuild') is currently experimental.`,
  );

  // Validate supported options
  // Currently only a subset of the Webpack-based browser builder options are supported.
  for (const unsupportedOption of UNSUPPORTED_OPTIONS) {
    const value = options[unsupportedOption];

    if (value === undefined || value === false) {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      continue;
    }
    if (unsupportedOption === 'inlineStyleLanguage' && value === 'css') {
      continue;
    }

    context.logger.warn(
      `The '${unsupportedOption}' option is currently unsupported by this experimental builder and will be ignored.`,
    );
  }
}
