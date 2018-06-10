/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NgModule, Component} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {RouterModule} from '@angular/router';
import { HelloWorldComponent } from './hello-world.component';

@Component({
  selector: 'hello-world-app',
  template: `
    <router-outlet></router-outlet>
  `,
})
export class AppComponent {
}


@NgModule({
  declarations: [AppComponent, HelloWorldComponent],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule.withServerTransition({appId: 'hlw'}),
    RouterModule.forRoot([
      { path: 'helloworld', component: HelloWorldComponent, pathMatch: 'full'},
      { path: 'helloworld/lazy', loadChildren: './lazy.module#LazyModule'}
    ]),
  ],
})
export class HelloWorldModule {
}
