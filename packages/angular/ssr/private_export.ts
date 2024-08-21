/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

export { ServerRenderContext as ɵServerRenderContext } from './src/render';
export { getRoutesFromAngularRouterConfig as ɵgetRoutesFromAngularRouterConfig } from './src/routes/ng-routes';
export {
  getOrCreateAngularServerApp as ɵgetOrCreateAngularServerApp,
  destroyAngularServerApp as ɵdestroyAngularServerApp,
} from './src/app';
export {
  setAngularAppManifest as ɵsetAngularAppManifest,
  setAngularAppEngineManifest as ɵsetAngularAppEngineManifest,
} from './src/manifest';
