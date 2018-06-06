/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

// Exports the webpack plugins we use internally.
export { BaseHrefWebpackPlugin } from '../lib/base-href-webpack/base-href-webpack-plugin';
export { CleanCssWebpackPlugin, CleanCssWebpackPluginOptions } from './cleancss-webpack-plugin';
export { BundleBudgetPlugin, BundleBudgetPluginOptions } from './bundle-budget';
export { ScriptsWebpackPlugin, ScriptsWebpackPluginOptions } from './scripts-webpack-plugin';
export { SuppressExtractedTextChunksWebpackPlugin } from './suppress-entry-chunks-webpack-plugin';
export {
  default as PostcssCliResources,
  PostcssCliResourcesOptions,
} from './postcss-cli-resources';

import { join } from 'path';
export const RawCssLoader = require.resolve(join(__dirname, 'raw-css-loader'));
