import {provide} from '@angular/core';
import {PlatformLocation} from '@angular/common';
import {ROUTER_PROVIDERS_COMMON} from '@angular/router-deprecated';

import {NodePlatformLocation} from './node_platform_location';

export * from './node_platform_location';

export const NODE_LOCATION_PROVIDERS: Array<any> = [
  provide(PlatformLocation, {useClass: NodePlatformLocation })
];


export const NODE_ROUTER_PROVIDERS = [
  ...ROUTER_PROVIDERS_COMMON,
  ...NODE_LOCATION_PROVIDERS
];
