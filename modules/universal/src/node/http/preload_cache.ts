import {
  provide,
  OpaqueToken,
  Injectable,
  Optional,
  Inject,
  EventEmitter,
  NgZone
} from 'angular2/core';

import {Observable} from 'rxjs';

import {
  Http,
  Connection,
  ConnectionBackend,
  // XHRConnection,
  XHRBackend,
  RequestOptions,
  ResponseType,
  ResponseOptions,
  ResponseOptionsArgs,
  RequestOptionsArgs,
  BaseResponseOptions,
  BaseRequestOptions,
  Request,
  Response,
  ReadyState,
  BrowserXhr,
  RequestMethod
} from 'angular2/http';
import {MockBackend} from 'angular2/src/http/backends/mock_backend';


import {isPresent, isBlank, CONST_EXPR} from 'angular2/src/facade/lang';

// CJS
import {XMLHttpRequest} from 'xhr2';
// import XMLHttpRequest = require('xhr2');


import {ORIGIN_URL, BASE_URL, PRIME_CACHE} from '../../common';


export function buildBaseUrl(url: string, existing?: boolean): any {
  let prop = existing ? 'useExisting' : 'useValue';
  return provide(BASE_URL, { [prop]: url });
}

export class NodeXhrConnection implements Connection {
  request: Request;
  /**
   * Response {@link EventEmitter} which emits a single {@link Response} value on load event of
   * `XMLHttpRequest`.
   */
  response: any;  // TODO: Make generic of <Response>;
  readyState: ReadyState;
  constructor(req: Request, browserXHR: BrowserXhr, baseResponseOptions?: ResponseOptions) {
    this.request = req;
    this.response = new Observable(responseObserver => {
      let _xhr: any = browserXHR.build();
      _xhr.open(RequestMethod[req.method].toUpperCase(), req.url);
      // load event handler
      let onLoad = () => {
        // responseText is the old-school way of retrieving response (supported by IE8 & 9)
        // response/responseType properties were introduced in XHR Level2 spec (supported by
        // IE10)
        let response = ('response' in _xhr) ? _xhr.response : _xhr.responseText;

        // normalize IE9 bug (http://bugs.jquery.com/ticket/1450)
        let status = _xhr.status === 1223 ? 204 : _xhr.status;

        // fix status code when it is 0 (0 status is undocumented).
        // Occurs when accessing file resources or on Android 4.1 stock browser
        // while retrieving files from application cache.
        if (status === 0) {
          status = response ? 200 : 0;
        }
        var responseOptions = new ResponseOptions({body: response, status: status});
        if (isPresent(baseResponseOptions)) {
          responseOptions = baseResponseOptions.merge(responseOptions);
        }
        responseObserver.next(new Response(responseOptions));
        // TODO(gdi2290): defer complete if array buffer until done
        responseObserver.complete();
      };
      // error event handler
      let onError = (err) => {
        var responseOptions = new ResponseOptions({body: err, type: ResponseType.Error});
        if (isPresent(baseResponseOptions)) {
          responseOptions = baseResponseOptions.merge(responseOptions);
        }
        responseObserver.error(new Response(responseOptions));
      };

      if (isPresent(req.headers)) {
        req.headers.forEach((values, name) => _xhr.setRequestHeader(name, values.join(',')));
      }

      _xhr.addEventListener('load', onLoad);
      _xhr.addEventListener('error', onError);

      _xhr.send(this.request.text());

      return () => {
        _xhr.removeEventListener('load', onLoad);
        _xhr.removeEventListener('error', onError);
        _xhr.abort();
      };
    });
  }
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
  build(): XMLHttpRequest {
    let xhr = new XMLHttpRequest();
    xhr.nodejsSet({ baseUrl: this._baseUrl });
    return xhr;
  }
}

@Injectable()
export class NodeXhrBackend {
  constructor(private _browserXHR: BrowserXhr, private _baseResponseOptions: ResponseOptions) {
  }
  createConnection(request: any): Connection {
    return new NodeXhrConnection(request, this._browserXHR, this._baseResponseOptions);
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
    @Inject(NgZone) protected _ngZone: NgZone,
    @Optional() @Inject(PRIME_CACHE) protected prime?: boolean) {

    super(_backend, _defaultOptions);

    var _rootNode = { children: [], res: null };
    this._rootNode = _rootNode;
    this._activeNode = _rootNode;

  }

  preload(url, factory) {

    var obs = new EventEmitter(false);

    var currentNode = null;

    if (this.prime) {

      if (isPresent(this._activeNode)) {
        currentNode = { children: [], res: null };
        this._activeNode.children.push(currentNode);
      }
    }

    // We need this to ensure all ajax calls are done before rendering the app
    this._async += 1;
    var request = factory();

    request
    .subscribe({
        next: (response) => {
          if (this.prime) {
            let headers = response.headers.toJSON();
            // TODO(gdi2290): fix Http to include the url
            let res = (<any>Object).assign({}, response, { headers, url });

            if (isPresent(currentNode)) {
              currentNode.res = res;
            }
          }
          obs.next(response);
        },
        error: (e) => {
          obs.error(e);
          this._async -= 1;
        },
        complete: () => {
          if (this.prime) {
            this._activeNode = currentNode;
            this._activeNode = null;
          }
          obs.complete();
          this._async -= 1;
        }
    });

    return obs;
  }

  request(url: string | Request, options?: RequestOptionsArgs): Observable<Response> {
    return this.preload(url, () => super.request(url, options));
  }

  get(url: string, options?: RequestOptionsArgs): Observable<Response> {
    return this.preload(url, () => super.get(url, options));

  }

  post(url: string, body: string, options?: RequestOptionsArgs): Observable<Response> {
    return this.preload(url, () => super.post(url, body, options));
  }

  put(url: string, body: string, options?: RequestOptionsArgs): Observable<Response> {
    return this.preload(url, () => super.put(url, body, options));
  }

  delete(url: string, options?: RequestOptionsArgs): Observable<Response> {
    return this.preload(url, () => super.delete(url, options));

  }

  patch(url: string, body: string, options?: RequestOptionsArgs): Observable<Response> {
    return this.preload(url, () => super.patch(url, body, options));
  }

  head(url: string, options?: RequestOptionsArgs): Observable<Response> {
    return this.preload(url, () => super.head(url, options));
  }


}
