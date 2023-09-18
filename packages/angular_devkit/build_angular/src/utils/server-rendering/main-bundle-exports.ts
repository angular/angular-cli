/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { ApplicationRef, Type } from '@angular/core';
import type { renderApplication, renderModule, ɵSERVER_CONTEXT } from '@angular/platform-server';
import type { extractRoutes } from '../routes-extractor/extractor';

export interface MainServerBundleExports {
  /** An internal token that allows providing extra information about the server context. */
  ɵSERVER_CONTEXT: typeof ɵSERVER_CONTEXT;

  /** Render an NgModule application. */
  renderModule: typeof renderModule;

  /** Method to render a standalone application. */
  renderApplication: typeof renderApplication;

  /** Standalone application bootstrapping function. */
  default: (() => Promise<ApplicationRef>) | Type<unknown>;

  /** Method to extract routes from the router config. */
  extractRoutes: typeof extractRoutes;
}
