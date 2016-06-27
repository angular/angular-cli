// import {ROUTER_PROVIDERS} from '@angular/router-deprecated';
import {PLATFORM_INITIALIZER} from '@angular/core';
export const BROWSER_ROUTER_PROVIDERS = [
  {
    provide: PLATFORM_INITIALIZER,
    useValue: () => {
      /* tslint:disable */
      console.warn('DEPRECATION WARNING: `BROWSER_ROUTER_PROVIDERS` is no longer supported for `angular2-universal` and will be removed in next release. Please use `ROUTER_PROVIDERS` from @angular/router');
      /* tslint:enable */
    },
    multi: true
  }
];
