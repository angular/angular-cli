import {PLATFORM_INITIALIZER} from '@angular/core';
import {PlatformLocation} from '@angular/common';
// import {ROUTER_PROVIDERS_COMMON} from '@angular/router-deprecated';

import {NodePlatformLocation} from './node_platform_location';

export * from './node_platform_location';

export const NODE_LOCATION_PROVIDERS: Array<any> = [
  {provide: PlatformLocation, useClass: NodePlatformLocation }
];


export const NODE_ROUTER_PROVIDERS = [
  {
    provide: PLATFORM_INITIALIZER,
    useValue: () => {
      /* tslint:disable */
      console.warn('DEPRECATION WARNING: `NODE_ROUTER_PROVIDERS` is no longer supported for `angular2-universal` and will be removed in next release. Please use `NODE_LOCATION_PROVIDERS` from angular2-universal and `ROUTER_PROVIDERS` from @angular/router');
      /* tslint:enable */
    },
    multi: true
  },
  // ...ROUTER_PROVIDERS_COMMON,
  ...NODE_LOCATION_PROVIDERS
];
