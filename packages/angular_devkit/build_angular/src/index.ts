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
  ExtraEntryPoint,
  ExtraEntryPointClass as ExtraEntryPointObject,
  FileReplacement,
  OptimizationClass as OptimizationObject,
  OptimizationUnion,
  OutputHashing,
  Schema as BrowserBuilderOptions,
  SourceMapClass as SourceMapObject,
  SourceMapUnion,
  StylePreprocessorOptions,
  Type,
} from './browser/schema';

export { buildWebpackBrowser as executeBrowserBuilder, BrowserBuilderOutput } from './browser';

export {
  serveWebpackBrowser as executeDevServerBuilder,
  DevServerBuilderOptions,
  DevServerBuilderOutput,
} from './dev-server';

export { execute as executeExtractI18nBuilder, ExtractI18nBuilderOptions } from './extract-i18n';

export { execute as executeKarmaBuilder, KarmaBuilderOptions, KarmaConfigOptions } from './karma';

export { execute as executeProtractorBuilder, ProtractorBuilderOptions } from './protractor';

export {
  execute as executeServerBuilder,
  ServerBuilderOptions,
  ServerBuilderOutput,
} from './server';

export { execute as executeNgPackagrBuilder, NgPackagrBuilderOptions } from './ng-packagr';
