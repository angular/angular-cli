/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import { type Observable, from } from 'rxjs';
import {
  type KarmaBuilderOptions,
  type KarmaConfigOptions,
  execute as executeKarmaBuilderInternal,
} from './builders/karma';
import type { ExecutionTransformer } from './transforms';

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

/**
 * @experimental Direct usage of this function is considered experimental.
 */
export function executeKarmaBuilder(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  transforms?: {
    webpackConfiguration?: ExecutionTransformer<import('webpack').Configuration>;
    karmaOptions?: (options: KarmaConfigOptions) => KarmaConfigOptions;
  },
): Observable<BuilderOutput> {
  return from(executeKarmaBuilderInternal(options, context, transforms));
}

export { type KarmaBuilderOptions, type KarmaConfigOptions };

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
