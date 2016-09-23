import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  isBrowser,
  UniversalModule,
  platformUniversalDynamic
} from 'angular2-universal/browser';

import { App, Wat } from './app';


export const platform = platformUniversalDynamic();

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
export class MainModule {
}

export function main() {

  console.log('isBrowser', isBrowser);
  // browserPlatform bootstrap
  return platform.bootstrapModule(MainModule);
}
