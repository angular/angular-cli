import {
  NgModule,
  Injectable,
  NgZone,
  Inject,
  Optional,
} from '@angular/core';

import {
  Connection,
  ConnectionBackend,
  Headers,
  ReadyState,
  Request,
  RequestOptions,
  RequestMethod,
  Response,
  ResponseOptions,
  ResponseType,

  Jsonp,
  JSONPBackend,
  BaseResponseOptions,
  BaseRequestOptions

} from '@angular/http';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import * as http from 'http';
import * as https from 'https';
import * as url from 'url';


import { BASE_URL, ORIGIN_URL } from './tokens';
import { isPresent, isSuccess } from './helper';

const JSONP_ERR_WRONG_METHOD = 'JSONP requests must use GET request method.';



export class NodeJSONPConnection {
  public readyState: ReadyState;
  public request: Request;
  public response: Observable<Response> | Observable<any>;

  constructor(
    req: Request,
    baseResponseOptions: ResponseOptions,
    ngZone: NgZone,
    @Optional() @Inject(ORIGIN_URL) originUrl: string = '',
    @Optional() @Inject(BASE_URL) baseUrl?: string) {

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
      ngZone.run(() => {
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
            var responseJson;
            try {
              var responseFactory = new Function('JSON_CALLBACK', body);
              responseFactory(json => {
                responseJson = json;
              });
            } catch (e) {
              console.log('JSONP Error:', e);
              throw e;
            }

            let responseOptions = new ResponseOptions({body: responseJson, status, headers, url});
            let response = new Response(responseOptions);

            if (isSuccess(status)) {
              ngZone.run(() => {
                responseObserver.next(response);
              });
              ngZone.run(() => {
                responseObserver.complete();
              });
              return;
            }
            ngZone.run(() => {
              responseObserver.error(response);
            });
          });
        });
      });

      let onError = (err) => {
        let responseOptions = new ResponseOptions({body: err, type: ResponseType.Error});
        if (isPresent(baseResponseOptions)) {
          responseOptions = baseResponseOptions.merge(responseOptions);
        }
        ngZone.run(() => {
          responseObserver.error(new Response(responseOptions));
        });
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
}

export abstract class NodeJsonpBackend extends ConnectionBackend {}

@Injectable()
export class NodeJsonpBackend_ extends NodeJsonpBackend {
  constructor(
    private _baseResponseOptions: ResponseOptions,
    private _ngZone: NgZone,
    @Inject(BASE_URL) private _baseUrl: string,
    @Inject(ORIGIN_URL) private _originUrl: string) {
    super()
  }

  public createConnection(request: Request) {
    return new NodeJSONPConnection(request, this._baseResponseOptions, this._ngZone, this._baseUrl, this._originUrl);
  }
}

export const NODE_HTTP_PROVIDERS = [

];

export const NODE_JSONP_PROVIDERS = [
  { provide: Jsonp, useFactory: jsonpFactory, deps: [JSONPBackend, RequestOptions] },
  { provide: RequestOptions, useClass: BaseRequestOptions },
  { provide: ResponseOptions, useClass: BaseResponseOptions },
  { provide: JSONPBackend, useClass: NodeJsonpBackend_ },
];

export function jsonpFactory(jsonpBackend: JSONPBackend, requestOptions: RequestOptions) {
  return new Jsonp(jsonpBackend, requestOptions);
}

@NgModule({
  providers: NODE_HTTP_PROVIDERS
})
export class NodeHttpModule {
}

@NgModule({
  providers: NODE_JSONP_PROVIDERS
})
export class NodeJsonpModule {
}
