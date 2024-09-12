/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// This file exports symbols that are not part of the public API but are
// dependencies of public API symbols. Including them here ensures they
// are tracked in the API golden file, preventing accidental breaking changes.

export type {
  ServerRouteAppShell,
  ServerRouteClient,
  ServerRoutePrerender,
  ServerRoutePrerenderWithParams,
  ServerRouteServer,
  ServerRouteCommon,
} from './src/routes/route-config';
