import {OpaqueToken} from 'angular2/core';
import {APP_BASE_HREF} from 'angular2/platform/common';

export const ORIGIN_URL: OpaqueToken = new OpaqueToken('originUrl');

export const REQUEST_URL: OpaqueToken = new OpaqueToken('requestUrl');

export const BASE_URL: OpaqueToken = APP_BASE_HREF;

export const PRIME_CACHE: OpaqueToken = new OpaqueToken('primeCache');
