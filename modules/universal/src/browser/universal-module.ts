import { NgModule, APP_ID, Inject } from '@angular/core';
import { HttpModule, JsonpModule } from '@angular/http';

import {
  BrowserModule,
  __platform_browser_private__
} from '@angular/platform-browser';

// @internal
function _randomChar() {
  return String.fromCharCode(97 + Math.floor(Math.random() * 25));
}
// @internal
function _appIdRandomProviderFactory() {
  return `${_randomChar()}${_randomChar()}${_randomChar()}`;
}
// PRIVATE
const SharedStylesHost: any = __platform_browser_private__.SharedStylesHost;
@NgModule({
  imports: [
  ],
  exports: [
    BrowserModule,
    HttpModule,
    JsonpModule
  ],
  providers: [
    {
      provide: APP_ID,
      useFactory: () => {
        let appId = null;
        let _win: any = window;
        let CACHE = _win.UNIVERSAL_CACHE;
        if (CACHE.APP_ID) {
          appId = CACHE.APP_ID;
        } else {
          appId = _appIdRandomProviderFactory();
        }
        return appId;
      }
    },
  ]
})
export class UniversalModule {
  constructor(@Inject(SharedStylesHost) sharedStylesHost: any) {
    const domStyles = document.head.querySelectorAll('style');
    const styles = Array.prototype.slice.call(domStyles)
      .filter((style) => style.innerText.indexOf('_ng') !== -1)
      .map((style) => style.innerText);

    styles.forEach(style => {
      sharedStylesHost._stylesSet.add(style);
      sharedStylesHost._styles.push(style);
    });
  }
  static withConfig(config = {}) {
    return {
      ngModule: UniversalModule,
      providers: [

      ]
    }
  }z
}
