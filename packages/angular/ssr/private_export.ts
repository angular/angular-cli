/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// ɵgetRoutesFromAngularRouterConfig is only used by the Webpack based server builder.
export {
  getRoutesFromAngularRouterConfig as ɵgetRoutesFromAngularRouterConfig,
  extractRoutesAndCreateRouteTree as ɵextractRoutesAndCreateRouteTree,
} from './src/routes/ng-routes';
export {
  ServerRenderContext as ɵServerRenderContext,
  getOrCreateAngularServerApp as ɵgetOrCreateAngularServerApp,
  destroyAngularServerApp as ɵdestroyAngularServerApp,
} from './src/app';
export {
  setAngularAppManifest as ɵsetAngularAppManifest,
  setAngularAppEngineManifest as ɵsetAngularAppEngineManifest,
} from './src/manifest';

export { AngularAppEngine as ɵAngularAppEngine } from './src/app-engine';

export { InlineCriticalCssProcessor as ɵInlineCriticalCssProcessor } from './src/utils/inline-critical-css';
