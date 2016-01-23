import { provide } from 'angular2/core';
import { PlatformLocation } from 'angular2/router';
import { ServerPlatformLocation } from './server_platform_location';

export * from './server_platform_location';

export const SERVER_LOCATION_PROVIDERS: Array<any> = [
  provide(PlatformLocation, { useClass: ServerPlatformLocation })
];

