/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

export { buildApplication, type ApplicationBuilderOptions } from './builders/application';
export type { ApplicationBuilderExtensions } from './builders/application/options';
export { type BuildOutputFile, BuildOutputFileType } from './tools/esbuild/bundler-context';
export type { BuildOutputAsset } from './tools/esbuild/bundler-execution-result';

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
  execute as executeNgPackagrBuilder,
  type NgPackagrBuilderOptions,
} from './builders/ng-packagr';
export {
  execute as executeUnitTestBuilder,
  type UnitTestBuilderOptions,
} from './builders/unit-test';

export { execute as executeKarmaBuilder, type KarmaBuilderOptions } from './builders/karma';
