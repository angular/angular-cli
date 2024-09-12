/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

export * from './private_export';

export { AngularAppEngine } from './src/app-engine';

export {
  type PrerenderFallback,
  type RenderMode,
  type ServerRoute,
  provideServerRoutesConfig,
} from './src/routes/route-config';
