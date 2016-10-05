import {
  NgModule,
  Injectable,
  NgZone,
  Inject,
  Optional,
  EventEmitter
} from '@angular/core';

import {
  Http,
  XHRConnection,
  ConnectionBackend,
  XHRBackend,
  Headers,
  ReadyState,
  Request,
  RequestOptions,
  RequestMethod,
  Response,
  ResponseOptions,
  RequestOptionsArgs,
  ResponseType,
  BrowserXhr,
  XSRFStrategy,

  Jsonp,
  JSONPBackend,
  BaseResponseOptions,
  BaseRequestOptions,
} from '@angular/http';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import * as http from 'http';
import * as https from 'https';
import * as url from 'url';


import { APP_BASE_HREF, ORIGIN_URL, REQUEST_URL } from './tokens';
import { isPresent, isSuccess } from './helper';

const JSONP_ERR_WRONG_METHOD = 'JSONP requests must use GET request method.';


declare var Zone: any;
export class PreloadHttp extends Http {
  _async: number = 0;
  // _rootNode;
  // _activeNode;
  constructor(
    protected _backend: ConnectionBackend,
    protected _defaultOptions: RequestOptions,
    /*@Optional() @Inject(PRIME_CACHE) protected prime: boolean = false*/) {

    super(_backend, _defaultOptions);

    // var _rootNode = { children: [], res: null };
    // this._rootNode = _rootNode;
    // this._activeNode = _rootNode;

  }
  preload(_url, factory) {

    var obs = new EventEmitter(false);


    // var currentNode = null;
    // if (this.prime) {

    //   if (isPresent(this._activeNode)) {
    //     currentNode = { children: [], res: null };
    //     this._activeNode.children.push(currentNode);
    //   }
    // }

    // We need this to ensure all ajax calls are done before rendering the app
    this._async += 1;
    var request = factory();

    request
    .subscribe({
        next: (response) => {
          // if (this.prime) {
          //   let headers = response.headers.toJSON();
          //   // TODO(gdi2290): fix Http to include the url
          //   let res = (<any>Object).assign({}, response, { headers, url });

          //   if (isPresent(currentNode)) {
          //     currentNode.res = res;
          //   }
          // }
          obs.next(response);
        },
        error: (e) => {
          obs.error(e);
          this._async -= 1;
        },
        complete: () => {
          // if (this.prime) {
          //   this._activeNode = currentNode;
          //   this._activeNode = null;
          // }
          obs.complete();
          this._async -= 1;
        }
    });

    return obs;
  }

  request(url: string | Request, options?: RequestOptionsArgs): Observable<Response> | EventEmitter<any> {
    return this.preload(url, () => super.request(url, options));
  }

  get(url: string, options?: RequestOptionsArgs): Observable<Response> | EventEmitter<any> {
    return this.preload(url, () => super.get(url, options));
  }
  post(url: string, body: string, options?: RequestOptionsArgs): Observable<Response> | EventEmitter<any> {
    return this.preload(url, () => super.post(url, body, options));
  }
  put(url: string, body: string, options?: RequestOptionsArgs): Observable<Response> | EventEmitter<any> {
    return this.preload(url, () => super.put(url, body, options));
  }
  delete(url: string, options?: RequestOptionsArgs): Observable<Response> | EventEmitter<any> {
    return this.preload(url, () => super.delete(url, options));
  }
  patch(url: string, body: string, options?: RequestOptionsArgs): Observable<Response> | EventEmitter<any> {
    return this.preload(url, () => super.patch(url, body, options));
  }
  head(url: string, options?: RequestOptionsArgs): Observable<Response> | EventEmitter<any> {
    return this.preload(url, () => super.head(url, options));
  }
}


@Injectable()
export class NodeConnection implements XHRConnection {
  public readyState: ReadyState;
  public request: Request;
  public response: Observable<Response> | Observable<any>;

  constructor(
    req: Request,
    baseResponseOptions: ResponseOptions,
    // ngZone: NgZone,
    @Inject(ORIGIN_URL) originUrl: string = '',
    @Optional() @Inject(APP_BASE_HREF) baseUrl?: string,
    // @Optional() @Inject(Cookie) cookie?: Cookie,
    // @Optional() @Inject(COOKIE_KEY) cookieKey?: any
    ) {

    this.request = req;
    // cookieKey = cookieKey || 'universal_angular2';
    baseUrl = baseUrl || '/';

    if (originUrl === null) {
      throw new Error('ERROR: Please move ORIGIN_URL to platformProviders');
    }

    let _reqInfo: any = url.parse(url.resolve(url.resolve(originUrl, baseUrl), req.url));
    _reqInfo.method = RequestMethod[req.method].toUpperCase();

    // if (isPresent(cookie)) {
    //   if (!isPresent(req.headers)) {
    //     req.headers = new Headers();
    //   }

    //   let cookieValue;
    //   try {
    //     cookieValue = cookie.get(cookieKey);
    //   } catch (e) {}
    //   if (cookieValue) {
    //     req.headers.append('Cookie', cookieValue);
    //   }
    // }

    if (isPresent(req.headers)) {
      _reqInfo.headers = {};
      req.headers.forEach((values, name) => _reqInfo.headers[name] = values.join(','));
    }
    _reqInfo.headers = _reqInfo.headers || {};
    // needed for node xhrs
    _reqInfo.headers['User-Agent'] = _reqInfo.headers['User-Agent'] || 'Angular 2 Universal';

    this.response = new Observable(responseObserver => {
      let nodeReq;
      // ngZone.run(() => {
        // http or https
        let xhrHttp: any = http;
        if (_reqInfo.protocol === 'https:') {
          xhrHttp = https;
        }

        nodeReq = xhrHttp.request(_reqInfo, (res: http.IncomingMessage) => {
          let body = '';
          res.on('data', (chunk) => body += chunk);

          let status = res.statusCode;
          let headers = new Headers(res.headers);
          let url = res.url;

          res.on('end', () => {
            let responseOptions = new ResponseOptions({body, status, headers, url});
            let response = new Response(responseOptions);

            if (isSuccess(status)) {
              // ngZone.run(() => {
                responseObserver.next(response);
              // });
              // ngZone.run(() => {
                responseObserver.complete();
              // });
              return;
            }
            // ngZone.run(() => {
              responseObserver.error(response);
            // });
          });
        });
      // });

      let onError = (err) => {
        let responseOptions = new ResponseOptions({body: err, type: ResponseType.Error});
        if (isPresent(baseResponseOptions)) {
          responseOptions = baseResponseOptions.merge(responseOptions);
        }
        // ngZone.run(() => {
          responseObserver.error(new Response(responseOptions));
        // });
      };

      nodeReq.on('error', onError);

      nodeReq.write(req.text());
      nodeReq.end();

      return () => {
        nodeReq.removeListener('error', onError);
        nodeReq.abort();
      };
    });
  }

  // This method can be reeused as it should be compatible
  setDetectedContentType = XHRConnection.prototype.setDetectedContentType;
}


@Injectable()
export class NodeBackend extends XHRBackend {
  constructor(
    private baseResponseOptions: ResponseOptions,
    _browserXHR: BrowserXhr,
    _xsrfStrategy: XSRFStrategy,
    _ngZone: NgZone,
    @Inject(APP_BASE_HREF) private _baseUrl: string,
    @Inject(ORIGIN_URL) private _originUrl: string) {
      super(_browserXHR, baseResponseOptions, _xsrfStrategy);
    }

  public createConnection(request: Request): NodeConnection {
    return new NodeConnection(request, this.baseResponseOptions, /*this._ngZone,*/ this._baseUrl, this._originUrl);
  }
}


export class NodeJSONPConnection {
  public readyState: ReadyState;
  public request: Request;
  public response: Observable<Response> | Observable<any>;

  constructor(
    req: Request,
    baseResponseOptions: ResponseOptions,
    ngZone: NgZone,
    @Optional() @Inject(ORIGIN_URL) originUrl: string = '',
    @Optional() @Inject(APP_BASE_HREF) baseUrl?: string) {

    if (req.method !== RequestMethod.Get) {
      throw new TypeError(JSONP_ERR_WRONG_METHOD);
    }


    this.request = req;
    baseUrl = baseUrl || '/';

    if (originUrl === null) {
      throw new Error('ERROR: Please move ORIGIN_URL to platformProviders');
    }

    let _reqInfo: any = url.parse(url.resolve(url.resolve(originUrl, baseUrl), req.url));
    _reqInfo.method = RequestMethod[req.method].toUpperCase();

    if (isPresent(req.headers)) {
      _reqInfo.headers = {};
      req.headers.forEach((values, name) => _reqInfo.headers[name] = values.join(','));
    }
    _reqInfo.headers = _reqInfo.headers || {};
    // needed for node jsonp xhrs
    _reqInfo.headers['User-Agent'] = _reqInfo.headers['User-Agent'] || 'Angular 2 Universal';


    this.response = new Observable(responseObserver => {
      let nodeReq;
      // http or https
      let xhrHttp: any = http;
      function DONE(response) {
        responseObserver.next(response);
        responseObserver.complete();
      }
      var __done = Zone.current.wrap(DONE, 'jsonp');

      if (_reqInfo.protocol === 'https:') {
        xhrHttp = https;
      }

      nodeReq = xhrHttp.request(_reqInfo, (res: http.IncomingMessage) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);

        let status = res.statusCode;
        let headers = new Headers(res.headers);
        let url = res.url;

        res.on('end', () => {
          var responseJson;
          try {
            if (body.indexOf('JSONP_CALLBACK') === -1) {
              throw new Error('Http request ' + req.url + ' did not return the response with JSONP_CALLBACK()')
            }
            var responseFactory = new Function('JSONP_CALLBACK', body);
            responseFactory(json => {
              responseJson = json;
            });
          } catch (e) {
            console.log('JSONP Error:', e);
            return onError(e);
          }

          let responseOptions = new ResponseOptions({body: responseJson, status, headers, url});
          let response = new Response(responseOptions);

          if (isSuccess(status)) {
            __done(response);
            return;
          }
          ngZone.run(() => {
            responseObserver.error(response);
          });
        });
      });

      function onError (err) {
        let responseOptions = new ResponseOptions({body: err, type: ResponseType.Error});
        if (isPresent(baseResponseOptions)) {
          responseOptions = baseResponseOptions.merge(responseOptions);
        }
        responseObserver.error(new Response(responseOptions));
      };

      nodeReq.on('error', onError);

      // nodeReq.write(req.text());
      nodeReq.end();

      return () => {
        nodeReq.removeListener('error', onError);
        nodeReq.abort();
      };
    });
  }
}

export abstract class NodeJsonpBackend extends ConnectionBackend {}

@Injectable()
export class NodeJsonpBackend_ extends NodeJsonpBackend implements JSONPBackend {
  constructor(
    private _baseResponseOptions: ResponseOptions,
    private _ngZone: NgZone,
    @Inject(APP_BASE_HREF) private _baseUrl: string,
    @Inject(ORIGIN_URL) private _originUrl: string) {
    super();
  }

  public createConnection(request: Request) {
    return new NodeJSONPConnection(request, this._baseResponseOptions, this._ngZone, this._baseUrl, this._originUrl);
  }
}

export const NODE_HTTP_PROVIDERS_COMMON: Array<any> = [
  {provide: RequestOptions, useClass: BaseRequestOptions},
  {provide: ResponseOptions, useClass: BaseResponseOptions}
];

export const NODE_HTTP_PROVIDERS = [
  ...NODE_HTTP_PROVIDERS_COMMON,
  { provide: Http, useFactory: httpFactory, deps: [XHRBackend, RequestOptions] },
  { provide: XHRBackend, useClass: NodeBackend },
];

export const NODE_JSONP_PROVIDERS = [
  ...NODE_HTTP_PROVIDERS_COMMON,
  { provide: Jsonp, useFactory: jsonpFactory, deps: [JSONPBackend, RequestOptions] },
  { provide: JSONPBackend, useClass: NodeJsonpBackend_ },
];

export function httpFactory(xhrBackend: XHRBackend, requestOptions: RequestOptions) {
  return new PreloadHttp(xhrBackend, requestOptions);
}
export function jsonpFactory(jsonpBackend: JSONPBackend, requestOptions: RequestOptions) {
  return new PreloadHttp(jsonpBackend, requestOptions);
}

@NgModule({
  providers: NODE_HTTP_PROVIDERS
})
export class NodeHttpModule {
  static forRoot(config: any = {}) {
    return NodeHttpModule.withConfig(config);
  }
  static withConfig(config: any = {}) {
    var providers = [];
    if (config.baseUrl) {
      providers.push({ provide: APP_BASE_HREF, useValue: config.baseUrl });
    }
    if (config.requestUrl) {
      providers.push({ provide: REQUEST_URL, useValue: config.requestUrl });
    }
    if (config.originUrl) {
      providers.push({ provide: ORIGIN_URL, useValue: config.originUrl });
    }
    return {
      ngModule: NodeHttpModule,
      providers
    };

  }
}

@NgModule({
  providers: NODE_JSONP_PROVIDERS
})
export class NodeJsonpModule {
  static forRoot(config: any = {}) {
    return NodeJsonpModule.withConfig(config);
  }
  static withConfig(config: any = {}) {
    var providers = [];
    if (config.baseUrl) {
      providers.push({ provide: APP_BASE_HREF, useValue: config.baseUrl });
    }
    if (config.requestUrl) {
      providers.push({ provide: REQUEST_URL, useValue: config.requestUrl });
    }
    if (config.originUrl) {
      providers.push({ provide: ORIGIN_URL, useValue: config.originUrl });
    }
    return {
      ngModule: NodeJsonpModule,
      providers
    };

  }
}
