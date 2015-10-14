/// <reference path="../../typings/tsd.d.ts" />

import '../server_patch';

import {
  bind,
  OpaqueToken,
  Injectable,
  Optional,
  Inject,
  EventEmitter
} from 'angular2/angular2';

import {
  Http,
  Connection,
  ConnectionBackend,
  // XHRConnection,
  XHRBackend,
  RequestOptions,
  ResponseTypes,
  ResponseOptions,
  ResponseOptionsArgs,
  RequestOptionsArgs,
  BaseResponseOptions,
  BaseRequestOptions,
  Request,
  Response,
  MockBackend,
  ReadyStates,
  BrowserXhr,
  RequestMethods
} from 'angular2/http';

import {ObservableWrapper} from 'angular2/src/core/facade/async';

import {
  isPresent,
  isBlank,
  CONST_EXPR
} from 'angular2/src/core/facade/lang';


import XMLHttpRequest = require('xhr2');

import { baseUrl } from '../helper';


export const BASE_URL: OpaqueToken = CONST_EXPR(new OpaqueToken('baseUrl'));

export const PRIME_CACHE: OpaqueToken = CONST_EXPR(new OpaqueToken('primeCache'));


class NodeConnection implements Connection {
  request: Request;
  /**
   * Response {@link EventEmitter} which emits a single {@link Response} value on load event of
   * `XMLHttpRequest`.
   */
  response: EventEmitter;  // TODO: Make generic of <Response>;
  readyState: ReadyStates;
  private _xhr;  // TODO: make type XMLHttpRequest, pending resolution of
                 // https://github.com/angular/ts2dart/issues/230
  constructor(req: Request, browserXHR: BrowserXhr, baseResponseOptions?: ResponseOptions) {
    // TODO: get rid of this when enum lookups are available in ts2dart
    // https://github.com/angular/ts2dart/issues/221

    this.request = req;
    this.response = new EventEmitter();
    this._xhr = browserXHR.build();

    // TODO(jeffbcross): implement error listening/propagation
    var _method = RequestMethods[req.method];

    this._xhr.open(_method, req.url );
    this._xhr.addEventListener('load', zone.bind((_) => {
      // responseText is the old-school way of retrieving response (supported by IE8 & 9)
      // response/responseType properties were introduced in XHR Level2 spec (supported by IE10)
      let response = ('response' in this._xhr) ? this._xhr.response : this._xhr.responseText;

      // normalize IE9 bug (http://bugs.jquery.com/ticket/1450)
      let status = this._xhr.status === 1223 ? 204 : this._xhr.status;

      // fix status code when it is 0 (0 status is undocumented).
      // Occurs when accessing file resources or on Android 4.1 stock browser
      // while retrieving files from application cache.
      if (status === 0) {
        status = response ? 200 : 0;
      }

      var responseOptions =  new ResponseOptions<any>({
        body: response,
        status: status,
        url: this.request.url
      });

      if (isPresent(baseResponseOptions)) {
        responseOptions = baseResponseOptions.merge(responseOptions);
      }

      let res = new Response<any>(responseOptions);

      ObservableWrapper.callNext(this.response, res);
      // TODO(gdi2290): defer complete if array buffer until done
      ObservableWrapper.callReturn(this.response);
    }));
    this._xhr.addEventListener('error', zone.bind((err) => {
      var responseOptions = new ResponseOptions<any>({body: err, type: ResponseTypes.Error, status: this._xhr.status});
      if (isPresent(baseResponseOptions)) {
        responseOptions = baseResponseOptions.merge(responseOptions);
      }
      ObservableWrapper.callThrow(this.response, new Response(responseOptions));
    }));
    // TODO(jeffbcross): make this more dynamic based on body type

    if (isPresent(req.headers)) {
      req.headers.forEach((value, name) => { this._xhr.setRequestHeader(name, value); });
    }
    var _text = this.request.text() || null;
    this._xhr.send(_text);
  }

  /**
   * Calls abort on the underlying XMLHttpRequest.
   */
  dispose(): void { this._xhr.abort(); }
}


@Injectable()
export class NodeXhr {
  _baseUrl: string;
  constructor(@Optional() @Inject(BASE_URL) baseUrl?: string) {

    if (isBlank(baseUrl)) {
      throw new Error('No base url set. Please provide a BASE_URL bindings.');
    }

    this._baseUrl = baseUrl;

  }
  build() {
    let xhr = new XMLHttpRequest();
    xhr.nodejsSet({ baseUrl: this._baseUrl });
    return xhr;
  }
}

@Injectable()
export class NodeBackend {
  constructor(private _browserXHR: BrowserXhr, private _baseResponseOptions: ResponseOptions) {
  }
  createConnection(request: any) {
    return new NodeConnection(request, this._browserXHR, this._baseResponseOptions);
  }
}


@Injectable()
export class NgPreloadCacheHttp extends Http {
  _async: number = 0;
  _callId: number = 0;
  _rootNode;
  _activeNode;
  constructor(
    protected _backend: ConnectionBackend,
    protected _defaultOptions: RequestOptions,
    @Optional() @Inject(PRIME_CACHE) protected prime?: boolean) {
    super(_backend, _defaultOptions);

    var _rootNode = { children: [], res: null };
    this._rootNode = _rootNode;
    this._activeNode = _rootNode;


  }

  preload(factory) {

    // TODO: fix this after the next release with RxNext
    var obs = new EventEmitter();

    var currentNode = null;
    if (isPresent(this._activeNode)) {
      currentNode = { children: [], res: null };
      this._activeNode.children.push(currentNode);
    }

    // We need this to ensure all ajax calls are done before rendering the app
    this._async += 1;
    let request = factory();
    ObservableWrapper
      .subscribe(
        request,
        value => {
          let res = Object.assign({}, value, {
            headers: value.headers.values()
          });
          if (isPresent(currentNode)) {
            currentNode.res = res;
          }
          ObservableWrapper.callNext(obs, value);
        },
        e => {
          // TODO: update Angular 2 Http
          setTimeout(() => {
            this._async -= 1;
            ObservableWrapper.callThrow(obs, e);
          });
        },
        () => {
          // TODO: update Angular 2 Http
          setTimeout(() => {
            this._activeNode = currentNode;
            this._async -= 1;
            ObservableWrapper.callReturn(obs);
            this._activeNode = null;
          });
        });

    return obs;
  }

  request(url: string | Request, options?: RequestOptionsArgs): EventEmitter {
    return isBlank(this.prime) ? super.request(url, options) : this.preload(() => super.request(url, options));
  }

  get(url: string, options?: RequestOptionsArgs): EventEmitter {
    return isBlank(this.prime) ? super.get(url, options) : this.preload(() => super.get(url, options));

  }

  post(url: string, body: string, options?: RequestOptionsArgs): EventEmitter {
    return isBlank(this.prime) ? super.post(url, body, options) : this.preload(() => super.post(url, body, options));
  }

  put(url: string, body: string, options?: RequestOptionsArgs): EventEmitter {
    return isBlank(this.prime) ? super.put(url, body, options) : this.preload(() => super.put(url, body, options));
  }

  delete(url: string, options?: RequestOptionsArgs): EventEmitter {
    return isBlank(this.prime) ? super.delete(url, options) : this.preload(() => super.delete(url, options));

  }

  patch(url: string, body: string, options?: RequestOptionsArgs): EventEmitter {
    return isBlank(this.prime) ? super.patch(url, body, options) : this.preload(() => super.patch(url, body, options));
  }

  head(url: string, options?: RequestOptionsArgs): EventEmitter {
    return isBlank(this.prime) ? super.head(url, options) : this.preload(() => super.head(url, options));
  }


}


export var HTTP_BINDINGS: Array<any> = [
  bind(RequestOptions).toClass(BaseRequestOptions),
  bind(ResponseOptions).toClass(BaseResponseOptions),

  bind(BrowserXhr).toClass(NodeXhr),
  bind(ConnectionBackend).toClass(NodeBackend),

  bind(Http).toClass(NgPreloadCacheHttp)
];
