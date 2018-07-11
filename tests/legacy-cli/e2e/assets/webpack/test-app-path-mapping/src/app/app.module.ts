/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Component, NgModule } from '@angular/core';
import { BrowserModule  } from '@angular/platform-browser';
import { Foo } from 'foo/foo';

console.log(Foo);  // Make sure it's used.

@Component({
  selector: 'home-view',
  template: 'home!',
})
export class HomeView {}

@NgModule({
  declarations: [
    HomeView,
  ],
  imports: [
    BrowserModule,
  ],
  bootstrap: [HomeView],
})
export class AppModule { }
