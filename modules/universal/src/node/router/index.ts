import {provide} from 'angular2/core';
import {PlatformLocation} from 'angular2/platform/common';
import {ROUTER_PROVIDERS_COMMON} from 'angular2/router';

import {NodePlatformLocation} from './node_platform_location';

export * from './node_platform_location';

export const NODE_LOCATION_PROVIDERS: Array<any> = [
  provide(PlatformLocation, {useClass: NodePlatformLocation })
];


export const NODE_ROUTER_PROVIDERS = [
  ...ROUTER_PROVIDERS_COMMON,
  ...NODE_LOCATION_PROVIDERS
];
