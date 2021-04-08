/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModuleFactory, StaticProvider, Type } from '@angular/core';
import { RenderOptions } from '@nguniversal/common/engine';
import { IRequestParams } from './request-params';

/** @deprecated use `@nguniversal/common` instead. */
export interface IEngineOptions extends Pick<RenderOptions, 'publicPath' | 'inlineCriticalCss'> {
  appSelector: string;                      // e.g., <app-root></app-root>
  request: IRequestParams;                  // e.g., params
  url?: string;                             // e.g., http://testhost.com
  document?: string;                        // e.g., <html>...</html>
  ngModule: Type<{}> | NgModuleFactory<{}>; // e.g., AppModule
  providers?: StaticProvider[];             // StaticProvider[]
}
