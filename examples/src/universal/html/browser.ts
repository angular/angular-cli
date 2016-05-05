console.time('@angular/core in client');
import * as angular from '@angular/core';
console.timeEnd('@angular/core in client');

import {bootstrap} from '@angular/platform-browser-dynamic';
import {HTTP_PROVIDERS} from '@angular/http';
import {ROUTER_PROVIDERS} from '@angular/router-deprecated';

import 'rxjs/Rx';
// import {
//   NG_PRELOAD_CACHE_PROVIDERS,
//   PRIME_CACHE
// } from '../../../../modules/universal/client/client';

import {App} from './app';

export function main() {
  return bootstrap(App, [
    ...HTTP_PROVIDERS,
    ...ROUTER_PROVIDERS
  ]);
}
