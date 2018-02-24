/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * A map keyed by loadChildren strings and Modules or NgModuleFactories as vaules
 */
import {NgModuleFactory, Type} from '@angular/core';

export type ModuleMap = {
  [key: string]: Type<any> | NgModuleFactory<any>;
};
