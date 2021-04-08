/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { InjectionToken } from '@angular/core';
import { Request, ResponseToolkit } from '@hapi/hapi';

/**
 * @deprecated use `@nguniversal/common` instead.
 */
export const REQUEST = new InjectionToken<Request>('REQUEST');

/**
 * @deprecated use `@nguniversal/common` instead.
 */
export const RESPONSE = new InjectionToken<ResponseToolkit>('RESPONSE');
