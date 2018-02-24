/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Type, NgModuleFactory, StaticProvider } from '@angular/core';
import { IRequestParams } from './request-params';

export interface IEngineOptions {
  appSelector: string;                      // e.g., <app-root></app-root>
  request: IRequestParams;                  // e.g., params
  ngModule: Type<{}> | NgModuleFactory<{}>; // e.g., AppModule
  providers?: StaticProvider[];             // StaticProvider[]
}
