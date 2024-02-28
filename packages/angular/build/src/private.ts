/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @fileoverview
 * Private exports intended only for use with the @angular-devkit/build-angular package.
 * All exports are not supported for external use, do not provide SemVer guarantees, and
 * their existence may change in any future version.
 */

// Builders
export { buildApplicationInternal } from './builders/application';
export { ApplicationBuilderInternalOptions } from './builders/application/options';

// Tools
export * from './tools/babel/plugins';
export { ExternalResultMetadata } from './tools/esbuild/bundler-execution-result';
export { emitFilesToDisk } from './tools/esbuild/utils';
export { transformSupportedBrowsersToTargets } from './tools/esbuild/utils';
export { SassWorkerImplementation } from './tools/sass/sass-service';

// Utilities
export * from './utils/bundle-calculator';
export { deleteOutputDir } from './utils/delete-output-dir';
export { I18nOptions, createI18nOptions, loadTranslations } from './utils/i18n-options';
export {
  IndexHtmlGenerator,
  type IndexHtmlGeneratorOptions,
  type IndexHtmlGeneratorProcessOptions,
  type IndexHtmlTransform,
} from './utils/index-file/index-html-generator';
export type { FileInfo } from './utils/index-file/augment-index-html';
export {
  type InlineCriticalCssProcessOptions,
  InlineCriticalCssProcessor,
  type InlineCriticalCssProcessorOptions,
} from './utils/index-file/inline-critical-css';
export { type TranslationLoader, createTranslationLoader } from './utils/load-translations';
export { purgeStaleBuildCache } from './utils/purge-cache';
export { augmentAppWithServiceWorker } from './utils/service-worker';
export { BundleStats, generateBuildStatsTable } from './utils/stats-table';
export { getSupportedBrowsers } from './utils/supported-browsers';
export { assertCompatibleAngularVersion } from './utils/version';

// Required for Vite-based dev server only
export { createRxjsEsmResolutionPlugin } from './tools/esbuild/rxjs-esm-resolution-plugin';
export { JavaScriptTransformer } from './tools/esbuild/javascript-transformer';
export { getFeatureSupport, isZonelessApp } from './tools/esbuild/utils';
export { renderPage } from './utils/server-rendering/render-page';
