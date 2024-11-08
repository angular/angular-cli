/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { RenderMode, ɵextractRoutesAndCreateRouteTree } from '@angular/ssr';
import { ESMInMemoryFileLoaderWorkerData } from './esm-in-memory-loader/loader-hooks';

type Writeable<T extends readonly unknown[]> = T extends readonly (infer U)[] ? U[] : never;

export interface RoutesExtractorWorkerData extends ESMInMemoryFileLoaderWorkerData {
  assetFiles: Record</** Destination */ string, /** Source */ string>;
}

export type SerializableRouteTreeNode = ReturnType<
  Awaited<ReturnType<typeof ɵextractRoutesAndCreateRouteTree>>['routeTree']['toObject']
>;

export type WritableSerializableRouteTreeNode = Writeable<SerializableRouteTreeNode>;

export interface RoutersExtractorWorkerResult {
  serializedRouteTree: SerializableRouteTreeNode;
  appShellRoute?: string;
  errors: string[];
}

/**
 * Local copy of `RenderMode` exported from `@angular/ssr`.
 * This constant is needed to handle interop between CommonJS (CJS) and ES Modules (ESM) formats.
 *
 * It maps `RenderMode` enum values to their corresponding numeric identifiers.
 */
export const RouteRenderMode: Record<keyof typeof RenderMode, RenderMode> = {
  Server: 0,
  Client: 1,
  Prerender: 2,
};
