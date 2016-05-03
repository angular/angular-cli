console.time('angular2/core in client');
import {createPlatform, coreLoadAndBootstrap, ReflectiveInjector} from 'angular2/core';
console.timeEnd('angular2/core in client');

import {BROWSER_PROVIDERS, BROWSER_APP_PROVIDERS, bootstrap} from 'angular2/platform/browser';
import {Http, HTTP_PROVIDERS} from 'angular2/http';

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
