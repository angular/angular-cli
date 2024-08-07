/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { InjectionToken } from '@angular/core';

/**
 * Injection token for the current request.
 */
export const REQUEST = new InjectionToken<Request>('REQUEST');

/**
 * Injection token for the response initialization options.
 */
export const RESPONSE_INIT = new InjectionToken<ResponseInit>('RESPONSE_INIT');

/**
 * Injection token for additional request context.
 */
export const REQUEST_CONTEXT = new InjectionToken<unknown>('REQUEST_CONTEXT');
