/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { InjectionToken } from '@angular/core';
import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

export const REQUEST = new InjectionToken<Request<ParamsDictionary>>('REQUEST');
export const RESPONSE = new InjectionToken<Response>('RESPONSE');
