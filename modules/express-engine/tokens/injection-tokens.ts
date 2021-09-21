/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { InjectionToken } from '@angular/core';
import { Request, Response } from 'express';

export const REQUEST: InjectionToken<Request> = new InjectionToken<Request>('REQUEST');
export const RESPONSE: InjectionToken<Response> = new InjectionToken<Response>('RESPONSE');
