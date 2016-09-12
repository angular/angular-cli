import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  isBrowser,
  UniversalModule,
  platformUniversalDynamic
} from 'angular2-universal/browser';

import { App, Wat } from './app';


export const platform = platformUniversalDynamic();

export function main() {
  @NgModule({
    bootstrap: [ App ],
    declarations: [ App, Wat ],
    imports: [
      UniversalModule,
      FormsModule
    ],
    providers: [

    ]
  })
  class MainModule {
  }

  console.log('isBrowser', isBrowser);
  // browserPlatform bootstrap
  return platform.bootstrapModule(MainModule);
}
