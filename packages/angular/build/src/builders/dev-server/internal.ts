/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

export { type BuildOutputFile, BuildOutputFileType } from '../../tools/esbuild/bundler-context';
export { createRxjsEsmResolutionPlugin } from '../../tools/esbuild/rxjs-esm-resolution-plugin';
export { JavaScriptTransformer } from '../../tools/esbuild/javascript-transformer';
export { getFeatureSupport, isZonelessApp } from '../../tools/esbuild/utils';
export { type IndexHtmlTransform } from '../../utils/index-file/index-html-generator';
export { purgeStaleBuildCache } from '../../utils/purge-cache';
export { getSupportedBrowsers } from '../../utils/supported-browsers';
export { transformSupportedBrowsersToTargets } from '../../tools/esbuild/utils';
export { buildApplicationInternal } from '../../builders/application';
export type { ApplicationBuilderInternalOptions } from '../../builders/application/options';
export type { ExternalResultMetadata } from '../../tools/esbuild/bundler-execution-result';
