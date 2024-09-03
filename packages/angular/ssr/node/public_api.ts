/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

export {
  CommonEngine,
  type CommonEngineRenderOptions,
  type CommonEngineOptions,
} from './src/common-engine/common-engine';

export {
  type AngularNodeServerAppManager,
  destroyAngularNodeAppEngine,
  getOrCreateAngularNodeAppEngine,
} from './src/app-engine';

export { writeResponseToNodeResponse } from './src/response';
export { createWebRequestFromNodeRequest } from './src/request';
