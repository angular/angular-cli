/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Request, Response } from 'hapi';
import { InjectionToken } from '@angular/core';

export const REQUEST = new InjectionToken<Request>('REQUEST');
export const RESPONSE = new InjectionToken<Response>('RESPONSE');
