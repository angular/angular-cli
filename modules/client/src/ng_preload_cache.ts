/// <reference path="../typings/tsd.d.ts" />
import {EventEmitter} from 'angular2/angular2';
import {
  Http,
  Response,
  Headers,
  RequestOptions,
  ConnectionBackend,
  XHRBackend
} from 'angular2/http';
import {ObservableWrapper} from 'angular2/src/core/facade/async';
import {
  isPresent,
  isBlank,
  CONST_EXPR
} from 'angular2/src/core/facade/lang';

import {bind, OpaqueToken, Injectable, Optional, Inject} from 'angular2/di';

export const PRIME_CACHE: OpaqueToken = CONST_EXPR(new OpaqueToken('primeCache'));


@Injectable()
export class NgPreloadCacheHttp extends Http {
  _cache = Object.create(null);
  prime: boolean = true;
  constructor(
    protected _backend: ConnectionBackend,
    protected _defaultOptions: RequestOptions) {
    super(_backend, _defaultOptions);
  }

  preload(method, key) {
    // let self = this;
    let obs = new EventEmitter();
    // setTimeout(() => {
      let newcache = (<any>window).ngPreloadCache;

      let cache: any = newcache;
      try {
        let res = Object.assign({}, newcache[key], {
          body: newcache[key]._body,
          headers: new Headers(newcache[key].headers)
        });
        cache = new Response(res);
        newcache[key] = null;
        newcache = null;
      } catch(e) {}

      if (cache && Object.keys(cache).length) {
        setTimeout(() => {
          ObservableWrapper.callNext(obs, cache);
          ObservableWrapper.callReturn(obs);
        });
      } else {
        let request = method();
        // request.observer(obs);
        request.observer({
          next(value) {
            // self._cache[key] = value;
            ObservableWrapper.callNext(obs, value);
          },
          throw(e) {
            setTimeout(() => {
              ObservableWrapper.callThrow(obs, e)
            });
          },
          return() {
            setTimeout(() => {
              ObservableWrapper.callReturn(obs)
            });
          }
        });
      }
    // });

    return obs;
  }

  request(url: string, options): EventEmitter {
    let key = JSON.stringify({
      url,
      options: options
    });
    return this.prime ? this.preload(() => super.request(url, options), key) : super.request(url, options);
  }

  get(url: string, options): EventEmitter {
    let key = JSON.stringify({
      url,
      options: options
    });
    return this.prime ? this.preload(() => super.get(url, options), key) : super.get(url, options);
  }

  post(url: string, body: string, options): EventEmitter {
    let key = JSON.stringify({
      url,
      body,
      options: options
    });
    return this.prime ? this.preload(() => super.post(url, body, options), key) : super.post(url, body, options);
  }

  put(url: string, body: string, options): EventEmitter {
    let key = JSON.stringify({
      url,
      body,
      options: options
    });
    return this.prime ? this.preload(() => super.put(url, body, options), key) : super.put(url, body, options);
  }

  delete(url: string, options): EventEmitter {
    let key = JSON.stringify({
      url,
      options: options
    });
    return this.prime ? this.preload(() => super.delete(url, options), key) : super.delete(url, options);
  }

  patch(url: string, body: string, options): EventEmitter {
    let key = JSON.stringify({
      url,
      body,
      options: options
    });
    return this.prime ? this.preload(() => super.patch(url, body, options), key) : super.patch(url, body, options);
  }

  head(url: string, options): EventEmitter {
    let key = JSON.stringify({
      url,
      options: options
    });
    return this.prime ? this.preload(() => super.head(url, options), key) : super.head(url, options);
  }
}

export const NG_PRELOAD_CACHE_BINDINGS = [
  bind(Http).toFactory(
    (xhrBackend, requestOptions) => {
      return new NgPreloadCacheHttp(xhrBackend, requestOptions);
    },
    [XHRBackend, RequestOptions])
];
