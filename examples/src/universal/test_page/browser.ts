console.time('@angular/core in client');
import {createPlatform, coreLoadAndBootstrap, ReflectiveInjector} from '@angular/core';
console.timeEnd('@angular/core in client');

import {bootstrap} from '@angular/platform-browser-dynamic';
import {HTTP_PROVIDERS} from '@angular/http';

import 'rxjs/Rx';
// import {
//   NG_PRELOAD_CACHE_PROVIDERS,
//   PRIME_CACHE
// } from '../../../../modules/universal/client/client';

import {App, MyApp} from './app';

export function main() {
  // return bootstrap(App, [
  //     HTTP_PROVIDERS,
  //
  // ]);
  // var injector = ReflectiveInjector.resolveAndCreate(BROWSER_PROVIDERS);
  // var platformInjector = createPlatform(injector).injector;
  // var appInjector = ReflectiveInjector.resolveAndCreate([
  //   BROWSER_APP_PROVIDERS,
  //   HTTP_PROVIDERS,
  //   /*
  //   NG_PRELOAD_CACHE_PROVIDERS,
  //   bind(PRIME_CACHE).toValue(true)
  //   */
  // ]);
  return Promise.all([
    bootstrap(App, [ HTTP_PROVIDERS]),
    bootstrap(MyApp, [ HTTP_PROVIDERS]),
  ]);
}
