/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

export * from './transforms';

export { CrossOrigin, OutputHashing, Type } from './builders/browser/schema';
export type {
  AssetPattern,
  AssetPatternClass as AssetPatternObject,
  Budget,
  FileReplacement,
  OptimizationClass as OptimizationObject,
  OptimizationUnion,
  Schema as BrowserBuilderOptions,
  SourceMapClass as SourceMapObject,
  SourceMapUnion,
  StylePreprocessorOptions,
} from './builders/browser/schema';

export {
  buildWebpackBrowser as executeBrowserBuilder,
  type BrowserBuilderOutput,
} from './builders/browser';

export { buildApplication, type ApplicationBuilderOptions } from '@angular/build';

export {
  executeDevServerBuilder,
  type DevServerBuilderOptions,
  type DevServerBuilderOutput,
} from './builders/dev-server';

export {
  execute as executeExtractI18nBuilder,
  type ExtractI18nBuilderOptions,
} from './builders/extract-i18n';

export {
  execute as executeKarmaBuilder,
  type KarmaBuilderOptions,
  type KarmaConfigOptions,
} from './builders/karma';

export {
  execute as executeProtractorBuilder,
  type ProtractorBuilderOptions,
} from './builders/protractor';

export {
  execute as executeServerBuilder,
  type ServerBuilderOptions,
  type ServerBuilderOutput,
} from './builders/server';

export {
  execute as executeSSRDevServerBuilder,
  type SSRDevServerBuilderOptions,
  type SSRDevServerBuilderOutput,
} from './builders/ssr-dev-server';

export {
  execute as executeNgPackagrBuilder,
  type NgPackagrBuilderOptions,
} from './builders/ng-packagr';
