import {
  Http,
  Response,
  Headers,
  RequestOptions,
  ResponseOptions,
  ConnectionBackend,
  XHRBackend
} from '@angular/http';
import {
  isPresent,
  isBlank
} from '@angular/core/src/facade/lang';

import {
  provide,
  OpaqueToken,
  Injectable,
  Optional,
  Inject,
  EventEmitter
} from '@angular/core';

import {Observable} from 'rxjs/Observable';


@Injectable()
export class NgPreloadCacheHttp extends Http {
  prime: boolean = true;
  constructor(
    protected _backend: ConnectionBackend,
    protected _defaultOptions: RequestOptions) {
    super(_backend, _defaultOptions);
  }

  preload(method): Observable<any> | EventEmitter<any> {
    let obs = new EventEmitter(false);
    let newcache = (<any>window).ngPreloadCache;
    if (newcache) {

      var preloaded = null;

      let res;
      preloaded = newcache.shift();
      if (isPresent(preloaded)) {
        let body = preloaded._body;
        res = new ResponseOptions((<any>Object).assign({}, preloaded, { body }));

        if (preloaded.headers) {
          res.headers = new Headers(preloaded);
        }
        preloaded = new Response(res);
      }

      if (preloaded) {
        obs.next(preloaded);
        obs.complete();
        return obs;
      }

    }
    let request = method();
    request.observer(obs);

    return obs;
  }

  request(url: string, options): Observable<Response> | EventEmitter<any> {
    return this.prime ? this.preload(() => super.request(url, options)) : super.request(url, options);
  }

  get(url: string, options): Observable<Response> | EventEmitter<any> {
    return this.prime ? this.preload(() => super.get(url, options)) : super.get(url, options);
  }

  post(url: string, body: string, options): Observable<Response> | EventEmitter<any> {
    return this.prime ? this.preload(() => super.post(url, body, options)) : super.post(url, body, options);
  }

  put(url: string, body: string, options): Observable<Response> | EventEmitter<any> {
    return this.prime ? this.preload(() => super.put(url, body, options)) : super.put(url, body, options);
  }

  delete(url: string, options): Observable<Response> | EventEmitter<any> {
    return this.prime ? this.preload(() => super.delete(url, options)) : super.delete(url, options);
  }

  patch(url: string, body: string, options): Observable<Response> | EventEmitter<any> {
    return this.prime ? this.preload(() => super.patch(url, body, options)) : super.patch(url, body, options);
  }

  head(url: string, options): Observable<Response> | EventEmitter<any> {
    return this.prime ? this.preload(() => super.head(url, options)) : super.head(url, options);
  }
}

export const NG_PRELOAD_CACHE_PROVIDERS: Array<any> = [
  provide(Http, {
    useFactory: (xhrBackend, requestOptions) => {
      return new NgPreloadCacheHttp(xhrBackend, requestOptions);
    },
    deps: [XHRBackend, RequestOptions]
  })
];
