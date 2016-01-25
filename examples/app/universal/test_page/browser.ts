console.time('angular2/core in client');
import * as angular from 'angular2/core';
console.timeEnd('angular2/core in client');

import {bootstrap} from 'angular2/platform/browser';
// import {
//   Http,
//   HTTP_PROVIDERS
// } from 'angular2/http';

// import {
//   NG_PRELOAD_CACHE_PROVIDERS,
//   PRIME_CACHE
// } from '../../../../modules/universal/client/client';

import {App} from './app';

export function main() {
  return bootstrap(App, [
    // HTTP_PROVIDERS,
    // NG_PRELOAD_CACHE_PROVIDERS,
    // bind(PRIME_CACHE).toValue(true)
  ]);
}
