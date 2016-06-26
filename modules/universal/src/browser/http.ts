import {HTTP_PROVIDERS, JSONP_PROVIDERS} from '@angular/http';
import {PLATFORM_INITIALIZER} from '@angular/core';
export const BROWSER_HTTP_PROVIDERS = [
  {
    provide: PLATFORM_INITIALIZER,
    useValue: () => {
      /* tslint:disable */
      console.warn('DEPRECATION WARNING: `BROWSER_HTTP_PROVIDERS` is no longer supported for `angular2-universal` and will be removed in next release. Please use `HTTP_PROVIDERS` from @angular/http');
      /* tslint:enable */
    },
    multi: true
  },
  ...HTTP_PROVIDERS
];
export const BROWSER_JSONP_PROVIDERS = [
  {
    provide: PLATFORM_INITIALIZER,
    useValue: () => {
      /* tslint:disable */
      console.warn('DEPRECATION WARNING: `BROWSER_JSONP_PROVIDERS` is no longer supported for `angular2-universal` and will be removed in next release. Please use `JSONP_PROVIDERS` from @angular/http');
      /* tslint:enable */
    },
    multi: true
  },
  JSONP_PROVIDERS
];
