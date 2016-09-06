import { OpaqueToken } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';

export const BASE_URL: OpaqueToken = APP_BASE_HREF;
export const ORIGIN_URL: OpaqueToken = new OpaqueToken('ORIGIN_URL');
export const REQUEST_URL: OpaqueToken = new OpaqueToken('REQUEST_URL');
export const PRIME_CACHE: OpaqueToken = new OpaqueToken('PRIME_CACHE');
export const COOKIE_KEY: OpaqueToken = new OpaqueToken('COOKIE_KEY');
export const NODE_APP_ID = new OpaqueToken('NODE_APP_ID');
export const UNIVERSAL_CONFIG = new OpaqueToken('UNIVERSAL_CONFIG');

// @internal
export function getUrlConfig() {
  return [
    { provide: BASE_URL, useValue: 'baseUrl' },
    { provide: APP_BASE_HREF, useValue: 'baseUrl' },
    { provide: REQUEST_URL, useValue: 'requestUrl' },
    { provide: ORIGIN_URL, useValue: 'originUrl' }
  ]
}

// @internal
export function createUrlProviders(config) {
  let providers = getUrlConfig()
  .reduce((memo, provider) => {
    let key = provider.useValue;
    if (key in config) {
      provider.useValue = config[key];
      memo.push(provider);
    }
    return memo;
  }, []);
  return providers
}
