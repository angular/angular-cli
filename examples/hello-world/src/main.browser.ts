import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule, JsonpModule } from '@angular/http';

import { isBrowser } from '@angular/universal/browser';


import {App, APP_PROVIDERS} from './app';
export function main() {
  console.log('isBrowser', isBrowser);

  // timeout to test preboot
  setTimeout(function () {
    return bootstrap(App, [
      ...APP_PROVIDERS,
      ...HTTP_PROVIDERS
    ])
      .then(() => {
        let preboot = prebootClient();
        preboot.complete();
      });
  }, 3000);
  return platform.bootstrapModule(MainModule);
}
