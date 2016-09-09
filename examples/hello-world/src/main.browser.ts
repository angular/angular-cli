import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { isBrowser, UniversalModule } from '@angular/universal/browser';

import { App, Wat } from './app';


export const platform = platformBrowserDynamic();

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
