/// <reference path="../typings/tsd.d.ts" />
import {BrowserXhr} from 'angular2/src/http/backends/browser_xhr';

import {bind, Injectable} from 'angular2/di';

import {
  Http,
  ConnectionBackend,
  RequestOptions,
  ResponseOptions,
  BaseResponseOptions,
  BaseRequestOptions,
  MockBackend
} from 'angular2/http';


function logging(type) {
  return function(...args) {
    console.log('logging ', type, ':', ...args);
  };
}

@Injectable()
export class NodeXhr extends BrowserXhr {
  abort: any;
  send: any;
  open: any;
  addEventListener: any;
  removeEventListener: any;
  response: any;
  responseText: string;
  constructor() {
    super();
    this.abort = logging('about');
    this.send  = logging('send');
    this.open  = logging('open');
    this.addEventListener = logging('addEventListener');
    this.removeEventListener = logging('removeEventListener');
  }
  build() {
    return new NodeXhr();
  }
}

@Injectable()
export class NodeBackend extends MockBackend {
  constructor(private _browserXHR: BrowserXhr, private _baseResponseOptions: ResponseOptions) {
    super(_browserXHR, _baseResponseOptions);
  }
  // createConnection(request: any) {
  //   return new XHRConnection(request, this._browserXHR, this._baseResponseOptions);
  // }
}

export var httpInjectables: Array<any> = [
  bind(ConnectionBackend).toClass(NodeBackend),
  bind(BrowserXhr).toClass(NodeXhr),

  bind(RequestOptions).toClass(BaseRequestOptions),
  bind(ResponseOptions).toClass(BaseResponseOptions),
  Http
];
