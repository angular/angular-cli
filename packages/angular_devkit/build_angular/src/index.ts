/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export * from './transforms';

export {
  AssetPattern,
  AssetPatternClass as AssetPatternObject,
  Budget,
  CrossOrigin,
  FileReplacement,
  OptimizationClass as OptimizationObject,
  OptimizationUnion,
  OutputHashing,
  Schema as BrowserBuilderOptions,
  SourceMapClass as SourceMapObject,
  SourceMapUnion,
  StylePreprocessorOptions,
  Type,
} from './builders/browser/schema';

export {
  buildWebpackBrowser as executeBrowserBuilder,
  BrowserBuilderOutput,
} from './builders/browser';

export {
  serveWebpackBrowser as executeDevServerBuilder,
  DevServerBuilderOptions,
  DevServerBuilderOutput,
} from './builders/dev-server';

export {
  execute as executeExtractI18nBuilder,
  ExtractI18nBuilderOptions,
} from './builders/extract-i18n';

export {
  execute as executeKarmaBuilder,
  KarmaBuilderOptions,
  KarmaConfigOptions,
} from './builders/karma';

export {
  execute as executeProtractorBuilder,
  ProtractorBuilderOptions,
} from './builders/protractor';

export {
  execute as executeServerBuilder,
  ServerBuilderOptions,
  ServerBuilderOutput,
} from './builders/server';

export { execute as executeNgPackagrBuilder, NgPackagrBuilderOptions } from './builders/ng-packagr';
