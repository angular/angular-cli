import { NgModule, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UniversalModule, createGlobalProxy } from 'angular2-universal/node';

import { App, Wat } from './app';

// @Component({
//   selector: 'app',
//   template: 'Hello Universal App'
// })
// class App {

// }

@NgModule({
  bootstrap: [ App ],
  declarations: [ App, Wat ],
  imports: [
    UniversalModule,
    FormsModule
  ]
})
export class MainModule {
  constructor() {
    createGlobalProxy();
  }
}
