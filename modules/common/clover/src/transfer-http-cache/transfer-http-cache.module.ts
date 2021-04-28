/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserTransferStateModule } from '@angular/platform-browser';
import { TransferHttpCacheInterceptor } from './transfer-http-cache.interceptor';

@NgModule({
  imports: [BrowserTransferStateModule],
  providers: [
    TransferHttpCacheInterceptor,
    { provide: HTTP_INTERCEPTORS, useExisting: TransferHttpCacheInterceptor, multi: true },
  ],
})
export class TransferHttpCacheModule { }
