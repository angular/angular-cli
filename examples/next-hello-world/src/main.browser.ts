import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

// import { isBrowser } from '@angular/universal/browser';


import { App } from './app';

@NgModule({
  bootstrap: [ App ],
  declarations: [ App ],
  imports: [
    BrowserModule
  ]
})
export class MainModule {}

export const platform = platformBrowserDynamic();

export function main() {
  // console.log('isBrowser', isBrowser);
  return platform.bootstrapModule(MainModule)
}
