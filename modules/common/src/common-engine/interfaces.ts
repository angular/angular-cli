/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {NgModuleFactory, StaticProvider, Type} from '@angular/core';

/** These are the allowed options for the engine */
export interface NgSetupOptions {
  bootstrap: Type<{}> | NgModuleFactory<{}>;
  providers?: StaticProvider[];
}

/** These are the allowed options for the render */
export interface RenderOptions extends NgSetupOptions {
  req: any;
  res?: any;
  document?: string;
  url?: string;
}
