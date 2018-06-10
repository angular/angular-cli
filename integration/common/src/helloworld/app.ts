/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {HelloWorldComponent} from './hello-world.component';
import {TransferHttpCacheModule} from '@nguniversal/common';
import {HttpClientModule} from '@angular/common/http';

@NgModule({
  declarations: [HelloWorldComponent],
  bootstrap: [HelloWorldComponent],
  imports: [
    HttpClientModule,
    BrowserModule.withServerTransition({appId: 'hlw'}),
    TransferHttpCacheModule,
  ],
})
export class HelloWorldModule {
}
