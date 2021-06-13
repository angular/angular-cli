/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import { createScrubFileTransformerFactory } from './transforms/scrub-file';

export {
  default as buildOptimizerLoader,
  buildOptimizerLoaderPath,
} from './build-optimizer/webpack-loader';
export { BuildOptimizerWebpackPlugin } from './build-optimizer/webpack-plugin';
export { buildOptimizer } from './build-optimizer/build-optimizer';

export { transformJavascript } from './helpers/transform-javascript';

export { getPrefixClassesTransformer } from './transforms/prefix-classes';
export { getPrefixFunctionsTransformer } from './transforms/prefix-functions';
export { getWrapEnumsTransformer } from './transforms/wrap-enums';

export function getScrubFileTransformer(
  program?: ts.Program,
): ts.TransformerFactory<ts.SourceFile> {
  return createScrubFileTransformerFactory(false)(program);
}

export function getScrubFileTransformerForCore(
  program?: ts.Program,
): ts.TransformerFactory<ts.SourceFile> {
  return createScrubFileTransformerFactory(true)(program);
}
