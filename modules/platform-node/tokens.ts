import { OpaqueToken } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';
export { APP_BASE_HREF } from '@angular/common';

// export const BASE_URL: OpaqueToken = APP_BASE_HREF;
export const ORIGIN_URL: OpaqueToken = new OpaqueToken('ORIGIN_URL');
export const REQUEST_URL: OpaqueToken = new OpaqueToken('REQUEST_URL');
export const PRIME_CACHE: OpaqueToken = new OpaqueToken('PRIME_CACHE');
export const COOKIE_KEY: OpaqueToken = new OpaqueToken('COOKIE_KEY');
export const NODE_APP_ID = new OpaqueToken('NODE_APP_ID');

// @internal
export function getUrlConfig() {
  return [
    { provide: APP_BASE_HREF, useValue: 'baseUrl' },
    { provide: REQUEST_URL, useValue: 'requestUrl' },
    { provide: ORIGIN_URL, useValue: 'originUrl' }
  ];
}

// @internal
export function createUrlProviders(config: any) {
  return getUrlConfig()
    .filter((provider) => (provider.useValue in config))
    .map((provider) => {
      const key = provider.useValue;
      provider.useValue = config[key];
      return provider;
    });
}
