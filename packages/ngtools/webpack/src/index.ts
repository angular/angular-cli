/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ivyInternal from './ivy';
export {
  AngularWebpackLoaderPath,
  AngularWebpackPlugin,
  AngularWebpackPluginOptions,
  default,
} from './ivy';

/** @deprecated Deprecated as of v12, please use the direct exports
 * (`AngularWebpackPlugin` instead of `ivy.AngularWebpackPlugin`)
 */
export namespace ivy {
  export const AngularWebpackLoaderPath = ivyInternal.AngularWebpackLoaderPath;
  export const AngularWebpackPlugin = ivyInternal.AngularWebpackPlugin;
  export type AngularWebpackPlugin = ivyInternal.AngularWebpackPlugin;
  export type AngularPluginOptions = ivyInternal.AngularWebpackPluginOptions;
}
