/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {
  execute as executeSSRDevServerBuilder,
  SSRDevServerBuilderOptions,
  SSRDevServerBuilderOutput,
} from './ssr-dev-server';

export {
  execute as executePrerenderBuilder,
} from './prerender';
export {
  PrerenderBuilderOptions,
  PrerenderBuilderOutput,
} from './prerender/models';
