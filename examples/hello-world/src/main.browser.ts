import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule, JsonpModule } from '@angular/http';

import { isBrowser } from '@angular/universal/browser';

import { App } from './app';

@NgModule({
  bootstrap: [ App ],
  declarations: [ App ],
  imports: [
    BrowserModule,
    HttpModule,
    JsonpModule
  ]
})
export class MainModule {}

export const platform = platformBrowserDynamic();

export function main() {
  console.log('isBrowser', isBrowser);
  // browserPlatform bootstrap
  return platform.bootstrapModule(MainModule);
}
