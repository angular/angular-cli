import { NgModule, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UniversalModule } from 'angular2-universal';

import { App, Wat } from './app';

@NgModule({
  bootstrap: [ App ],
  declarations: [ App, Wat ],
  imports: [
    UniversalModule,
    FormsModule
  ]
})
export class MainModule {
}
