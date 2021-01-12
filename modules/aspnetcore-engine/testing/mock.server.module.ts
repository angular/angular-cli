/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Component, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ServerModule } from '@angular/platform-server';

@Component({selector: 'root', template: 'some template'})
export class MockComponent {
}

@NgModule({
  imports: [BrowserModule.withServerTransition({appId: 'mock'}), ServerModule],
  declarations: [MockComponent],
  bootstrap: [MockComponent],
})
export class MockServerModule {
}
