import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import {
  BrowserModule,
  __platform_browser_private__
} from '@angular/platform-browser';
import { NgModule, APP_ID, Inject } from '@angular/core';
import { HttpModule, JsonpModule } from '@angular/http';

import { isBrowser } from '@angular/universal/browser';

import { App, Wat } from './app';


const SharedStylesHost: any = __platform_browser_private__.SharedStylesHost;

export const platform = platformBrowserDynamic();

export function main() {
  @NgModule({
    bootstrap: [ App ],
    declarations: [ App, Wat ],
    imports: [
      BrowserModule,
      HttpModule,
      JsonpModule
    ],
    providers: [
      {provide: APP_ID, useValue: (<any>window).UNIVERSAL_CACHE.APP_ID},

    ]
  })
  class MainModule {
    constructor(@Inject(SharedStylesHost) sharedStylesHost: any) {

      var styles = Array.prototype.slice.call(document.head.querySelectorAll('style'), 0)
        .filter((style) => style.innerText.indexOf('_ng') !== -1)
        .map((style) => style.innerText)
      styles.forEach(style => {
        sharedStylesHost._stylesSet.add(style);
        sharedStylesHost._styles.push(style);
      });

    }
  }

  console.log('isBrowser', isBrowser);
  // browserPlatform bootstrap
  return platform.bootstrapModule(MainModule);
}
