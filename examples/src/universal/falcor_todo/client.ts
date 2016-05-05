import {provide} from '@angular/core';

import {bootstrap} from '@angular/platform-browser-dynamic';


import {ROUTER_PROVIDERS} from '@angular/router-deprecated';

import {HTTP_PROVIDERS} from '@angular/http';

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
