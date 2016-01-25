import {provide} from 'angular2/core';

import {bootstrap} from 'angular2/platform/browser';


import {ROUTER_PROVIDERS} from 'angular2/router';

import {HTTP_PROVIDERS} from 'angular2/http';

// import {
//   NG_PRELOAD_CACHE_PROVIDERS,
//   PRIME_CACHE
// } from '../../../../modules/universal/client/client';


import {TodoApp} from './app';

export function main() {
  return bootstrap(TodoApp, [
    ROUTER_PROVIDERS,
    HTTP_PROVIDERS,
    // NG_PRELOAD_CACHE_PROVIDERS,
    // provide(PRIME_CACHE, {useValue: true})
  ]);
}
