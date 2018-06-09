/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {NgModuleFactory, StaticProvider, Type} from '@angular/core';

/** These are the allowed options for the render */
export interface RenderOptions {
  bootstrap: Type<{}> | NgModuleFactory<{}>;
  providers?: StaticProvider[];
  url?: string;
  document?: string;
  documentFilePath?: string;
}
