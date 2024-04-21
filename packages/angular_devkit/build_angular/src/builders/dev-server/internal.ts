/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export { BuildOutputFile, BuildOutputFileType } from '@angular/build';
export {
  type ApplicationBuilderInternalOptions,
  type ExternalResultMetadata,
  JavaScriptTransformer,
  buildApplicationInternal,
  createRxjsEsmResolutionPlugin,
  getFeatureSupport,
  getSupportedBrowsers,
  isZonelessApp,
  transformSupportedBrowsersToTargets,
  type IndexHtmlTransform,
  purgeStaleBuildCache,
} from '@angular/build/private';
