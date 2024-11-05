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

export { AngularNodeAppEngine } from './src/app-engine';

export { createNodeRequestHandler, type NodeRequestHandlerFunction } from './src/handler';
export { writeResponseToNodeResponse } from './src/response';
export { createWebRequestFromNodeRequest } from './src/request';
export { isMainModule } from './src/module';
