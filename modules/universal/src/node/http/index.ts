import {
  ConnectionBackend,
  ResponseOptions,
  RequestOptions,
  BrowserXhr,
  Http,
  BaseRequestOptions,
  BaseResponseOptions
} from 'angular2/http';
import {provide, NgZone, PLATFORM_INITIALIZER} from 'angular2/core';
import * as nodeHttp from './node_http'
import * as preloadCache from './preload_cache';

export * from './node_http'
export * from './preload_cache';

export var NODE_HTTP_PROVIDERS: Array<any> = [
  provide(RequestOptions, {useClass: BaseRequestOptions}),
  provide(ResponseOptions, {useClass: BaseResponseOptions}),

  provide(nodeHttp.NodeBackend, {
    useFactory: (respOpt, ngZone) => {
      return new nodeHttp.NodeBackend(respOpt, ngZone);
    },
    deps: [ResponseOptions, NgZone]
  }),

  provide(ConnectionBackend, {useClass: nodeHttp.NodeBackend}),
  provide(Http, {useClass: Http})
];

export var NODE_PRELOAD_CACHE_HTTP_PROVIDERS: Array<any> = [
  provide(preloadCache.BASE_URL, {useValue: ''}),
  provide(preloadCache.PRIME_CACHE, {useValue: false}),
  provide(RequestOptions, {useClass: BaseRequestOptions}),
  provide(ResponseOptions, {useClass: BaseResponseOptions}),

  provide(BrowserXhr, {useClass: preloadCache.NodeXhr}),
  // provide(ConnectionBackend, {useClass: preloadCache.NodeXhrBackend}),
  provide(ConnectionBackend, {useClass: nodeHttp.NodeBackend}),

  provide(Http, {useClass: preloadCache.NgPreloadCacheHttp})
];


export const HTTP_PROVIDERS = NODE_HTTP_PROVIDERS.concat([
  provide(PLATFORM_INITIALIZER, {useValue: () => {
    console.warn(
      'DEPRECATION WARNING: `HTTP_PROVIDERS` is no longer supported for `angular2-universal` and will be removed in next release. Please use `NODE_HTTP_PROVIDERS`');
  }, multi: true})
]);
