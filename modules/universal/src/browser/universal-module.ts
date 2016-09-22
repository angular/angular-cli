import {
  NgModule,
  APP_ID,
  Inject,
  APP_BOOTSTRAP_LISTENER,
  Injectable,
  createPlatformFactory,
  PlatformRef
} from '@angular/core';
import { HttpModule, JsonpModule } from '@angular/http';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import {
  BrowserModule,
  __platform_browser_private__
} from '@angular/platform-browser';

var prebootClient;
try {
  prebootClient = require('preboot/__build/src/browser/preboot_browser');
  prebootClient = (prebootClient && prebootClient.prebootClient) || prebootClient;
} catch (e) {}

// @internal
function _randomChar() {
  return String.fromCharCode(97 + Math.floor(Math.random() * 25));
}
// @internal
function _appIdRandomProviderFactory() {
  return `${_randomChar()}${_randomChar()}${_randomChar()}`;
}
// PRIVATE

@Injectable()  // so that metadata is gathered for this class
export class OpaqueToken {
  constructor(private _desc: string) {}

  toString(): string { return `Token ${this._desc}`; }
}

const SharedStylesHost: any = __platform_browser_private__.SharedStylesHost;

export const UNIVERSAL_CACHE = new OpaqueToken('UNIVERSAL_CACHE');
export const AUTO_PREBOOT = new OpaqueToken('AUTO_PREBOOT');

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
      provide: UNIVERSAL_CACHE,
      useFactory: () => {
        let _win: any = window;
        let CACHE = Object.assign({}, _win.UNIVERSAL_CACHE || {});
        delete _win.UNIVERSAL_CACHE;
        return CACHE;
      }
    },
    {
      provide: APP_ID,
      useFactory: () => {
        let _win: any = window;
        let CACHE = _win.UNIVERSAL_CACHE || {};
        let appId = null;
        if (CACHE.APP_ID) {
          appId = CACHE.APP_ID;
        } else {
          appId = _appIdRandomProviderFactory();
        }
        return appId;
      },
      deps: []
    },
    {
      provide: AUTO_PREBOOT,
      useValue: true
    },
    {
      multi: true,
      provide: APP_BOOTSTRAP_LISTENER,
      useFactory: (autoPreboot: boolean) => {
        return () => {
          let _win: any = window;
          if (_win && prebootClient && autoPreboot) {
            setTimeout(() => prebootClient().complete());
          }
        };
      },
      deps: [ AUTO_PREBOOT ],
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
  static withConfig(_config: any = {}): {ngModule: UniversalModule, providers: any[]} {
    const providers = [];

    if (typeof _config.autoPreboot === 'boolean') {
      providers.push({
        provide: AUTO_PREBOOT,
        useValue: _config.autoPreboot,
      });
    }

    return {
      ngModule: UniversalModule,
      providers: providers,
    };
  }
}

export function platformUniversalDynamic (extraProviders?: any[]): PlatformRef {
  const platform: PlatformRef = createPlatformFactory(platformBrowserDynamic, 'universalBrowserDynamic', [])(extraProviders);
  return platform;
};
