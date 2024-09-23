/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

export * from './private_export';

export { AngularAppEngine } from './src/app-engine';
export { createRequestHandler } from './src/handler';

export {
  type PrerenderFallback,
  type ServerRoute,
  provideServerRoutesConfig,
  RenderMode,
} from './src/routes/route-config';
