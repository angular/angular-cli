/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NgModule} from '@angular/core';
import {ServerModule} from '@angular/platform-server';

import {HelloWorldModule, AppComponent} from './app';
import {ModuleMapLoaderModule} from '@nguniversal/module-map-ngfactory-loader';

@NgModule({
  bootstrap: [AppComponent],
  imports: [HelloWorldModule, ServerModule, ModuleMapLoaderModule],
})
export class HelloWorldServerModule {
}
