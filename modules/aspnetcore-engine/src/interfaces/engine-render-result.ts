/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModuleRef } from '@angular/core';

export interface IEngineRenderResult {
  html: string;
  moduleRef: NgModuleRef<{}>;
  globals: {
    styles: string;
    title: string;
    meta: string;
    transferData?: {};
    [key: string]: any;
  };
}
