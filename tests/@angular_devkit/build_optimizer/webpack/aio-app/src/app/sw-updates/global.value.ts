/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { InjectionToken } from '@angular/core';


export const Global = new InjectionToken<Window>('global');
export const globalProvider = { provide: Global, useFactory: globalFactory };
export function globalFactory() {
  return window;
}
