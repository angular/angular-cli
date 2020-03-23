/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// Exports the webpack plugins we use internally.
export { AnyComponentStyleBudgetChecker } from './any-component-style-budget-checker';
export { OptimizeCssWebpackPlugin, OptimizeCssWebpackPluginOptions } from './optimize-css-webpack-plugin';
export { BundleBudgetPlugin, BundleBudgetPluginOptions } from './bundle-budget';
export { ScriptsWebpackPlugin, ScriptsWebpackPluginOptions } from './scripts-webpack-plugin';
export { SuppressExtractedTextChunksWebpackPlugin } from './suppress-entry-chunks-webpack-plugin';
export { RemoveHashPlugin, RemoveHashPluginOptions } from './remove-hash-plugin';
export { NamedLazyChunksPlugin } from './named-chunks-plugin';
export { CommonJsUsageWarnPlugin } from './common-js-usage-warn-plugin';
export {
  default as PostcssCliResources,
  PostcssCliResourcesOptions,
} from './postcss-cli-resources';

import { join } from 'path';
export const RawCssLoader = require.resolve(join(__dirname, 'raw-css-loader'));
export const WebpackRollupLoader = require.resolve(join(__dirname, 'webpack-rollup-loader'));
