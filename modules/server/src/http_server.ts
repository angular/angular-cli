/// <reference path="../typings/tsd.d.ts" />

// FIX: reflect-metadata shim is required when using class decorators
import 'reflect-metadata';
//

import {BrowserXhr} from 'angular2/src/http/backends/browser_xhr';
import {RequestMethodsMap} from 'angular2/src/http/enums';

import {
  bind, 
  Injectable
} from 'angular2/di';

import {
  Http,
  Connection,
  ConnectionBackend,
  // XHRConnection,
  XHRBackend,
  RequestOptions,
  ResponseOptions,
  BaseResponseOptions,
  BaseRequestOptions,
  Request,
  Response,
  MockBackend,
  ReadyStates
} from 'angular2/http';

import {
  EventEmitter, 
  ObservableWrapper
} from 'angular2/src/facade/async';

import {
  isPresent, 
  ENUM_INDEX
} from 'angular2/src/facade/lang';

import { baseUrl } from './helper';

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
    
    var requestMethodsMap = new RequestMethodsMap();
    this.request = req;
    this.response = new EventEmitter();
    this._xhr = browserXHR.build();

    // TODO(jeffbcross): implement error listening/propagation
    var _method = requestMethodsMap.getMethod(ENUM_INDEX(req.method));

    this._xhr.open(_method, req.url );
    this._xhr.addEventListener('load', (_) => {
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

      var responseOptions = new ResponseOptions({body: response, status: status});
      if (isPresent(baseResponseOptions)) {
        responseOptions = baseResponseOptions.merge(responseOptions);
      }

      ObservableWrapper.callNext(this.response, new Response(responseOptions));
      // TODO(gdi2290): defer complete if array buffer until done
      ObservableWrapper.callReturn(this.response);
    });
    // TODO(jeffbcross): make this more dynamic based on body type

    if (isPresent(req.headers)) {
      req.headers.forEach((value, name) => { this._xhr.setRequestHeader(name, value); });
    }
    // var _url = 'http://127.0.0.1:3000/api/todos';
    var _text = this.request.text();
    this._xhr.send(_text);
  }

  /**
   * Calls abort on the underlying XMLHttpRequest.
   */
  dispose(): void { this._xhr.abort(); }
}


@Injectable()
export class NodeXhr {
  constructor() {}
  build() {
    let XMLHttpRequest = require('xhr2');
    XMLHttpRequest.nodejsSet({baseUrl: baseUrl()});
    return new XMLHttpRequest();
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

export var httpInjectables: Array<any> = [
  bind(RequestOptions).toClass(BaseRequestOptions),
  bind(ResponseOptions).toClass(BaseResponseOptions),

  bind(BrowserXhr).toClass(NodeXhr),
  bind(ConnectionBackend).toClass(NodeBackend),

  Http
];
