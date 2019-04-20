/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// TODO: remove this commented AJV require.
// We don't actually require AJV, but there is a bug with NPM and peer dependencies that is
// whose workaround is to depend on AJV.
// See https://github.com/angular/angular-cli/issues/9691#issuecomment-367322703 for details.
// We need to add a require here to satisfy the dependency checker.
// require('ajv');

export * from './transforms';

export {
  AssetPattern,
  AssetPatternClass as AssetPatternObject,
  Budget,
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

export {
  buildWebpackBrowser as executeBrowserBuilder,
  BrowserBuilderOutput,
} from './browser';

export {
  serveWebpackBrowser as executeDevServerBuilder,
  DevServerBuilderOptions,
  DevServerBuilderOutput,
} from './dev-server';

export {
  execute as executeKarmaBuilder,
  KarmaBuilderOptions,
  KarmaConfigOptions,
} from './karma';

export {
  execute as executeServerBuilder,
  ServerBuilderOptions,
  ServerBuilderOutput,
} from './server';
